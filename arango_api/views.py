from django.http import JsonResponse, HttpResponseNotFound
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.utils import json

from arango_api import utils
from arango_api.db import db_ontologies, GRAPH_NAME_ONTOLOGIES

# TODO: Move from global?
EDGE_COLLECTIONS = {
    "CL": "CL-CL",
    "GO": "GO-GO",
    "PATO": "PATO-PATO",
    "MONDO": "MONDO-MONDO",
    "UBERON": "UBERON-UBERON",
}

INITIAL_ROOT_IDS = [
    "CL/0000000",
    "GO/0008150",  # biological_process
    "GO/0003674",  # molecular_function
    "GO/0005575",  # cellular_component
    "PATO/0000001",
    "MONDO/0000001",
    "UBERON/0000000",
]


@api_view(["POST"])
def list_collection_names(request):
    graph = request.data.get("graph")
    objects = utils.get_document_collections(graph)
    collection_names = [collection["name"] for collection in objects]
    return JsonResponse(collection_names, safe=False)


@api_view(["POST"])
def list_by_collection(request, coll):
    graph = request.data.get("graph")
    objects = utils.get_all_by_collection(coll, graph)
    return JsonResponse(list(objects), safe=False)


@api_view(["GET", "PUT", "DELETE"])
def get_object(request, coll, pk):
    try:
        item = utils.get_by_id(coll, pk)
        if item:
            return JsonResponse(item, safe=False)
        else:
            return HttpResponseNotFound("Object not found")
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["GET"])
def get_related_edges(request, edge_coll, dr, item_coll, pk):
    # TODO: Document arguments
    edges = utils.get_edges_by_id(edge_coll, dr, item_coll, pk)
    return JsonResponse(list(edges), safe=False)


@api_view(["GET"])
def get_search_items(request, st):
    search_results = utils.search_by_term(st)
    return JsonResponse(search_results, safe=False)


@api_view(["POST"])
def get_graph(request):
    node_ids = request.data.get("node_ids")
    depth = request.data.get("depth")
    edge_direction = request.data.get("edge_direction")
    allowed_collections = request.data.get("allowed_collections")
    node_limit = request.data.get("node_limit", 100)
    graph = request.data.get("graph", 100)

    search_results = utils.get_graph(
        node_ids, depth, edge_direction, allowed_collections, node_limit, graph
    )
    return JsonResponse(search_results, safe=False)


@api_view(["POST"])
def get_shortest_paths(request):
    node_ids = request.data.get("node_ids")
    edge_direction = request.data.get("edge_direction")

    search_results = utils.get_shortest_paths(
        node_ids,
        edge_direction,
    )
    return JsonResponse(search_results, safe=False)


@api_view(["GET"])
def get_all(request):
    search_results = utils.get_all()
    return JsonResponse(search_results, safe=False)


@api_view(["POST"])
def run_aql_query(request):
    # Extract the AQL query from the request body
    query = request.data.get("query")
    if not query:
        return JsonResponse({"error": "No query provided"}, status=400)

    # Run the AQL query
    try:
        search_results = utils.run_aql_query(query)
        return JsonResponse(search_results, safe=False)
    except Exception as e:
        ##TODO: Handle errors
        return JsonResponse({"error": str(e)}, status=500)


@api_view(['POST'])
def get_sunburst(request):
    """
    API endpoint for fetching sunburst data, supporting initial load (L0+L1)
    and loading children + grandchildren (L N+1, L N+2) on demand.
    Includes extensive debugging print statements.
    """
    if db_ontologies is None:
        print("ERROR: db_ontologies object is None. Cannot proceed.")
        return Response({"error": "Database connection not available."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    parent_id = request.data.get('parent_id', None)
    print(f"\n--- Request Received ---")
    print(f"DEBUG: parent_id received: {parent_id}")


    if parent_id:
        # === Fetch Children (C) AND Grandchildren (G) for the given parent_id (P) ===
        print(f"DEBUG: Handling request for children/grandchildren of parent_id: {parent_id}")

        # AQL Query: Fetches C nodes and their G children
        query_children_grandchildren = """
            LET start_node_id = @parent_id // This is P

            // Find direct children (Level N+1, Nodes C)
            // Ensure edge direction and filter are correct for your 'subClassOf'
            FOR child_node, edge1 IN 1..1 INBOUND start_node_id GRAPH @graph_name
                FILTER edge1.label == 'subClassOf' // <<< Check Case Sensitivity

                // For each child_node (C), find its children (Level N+2, Nodes G)
                LET grandchildren = (
                    FOR grandchild_node, edge2 IN 1..1 INBOUND child_node._id GRAPH @graph_name
                        FILTER edge2.label == 'subClassOf'

                        // Check if grandchild (G) has children (Level N+3)
                        LET grandchild_has_children = COUNT(
                            FOR great_grandchild, edge3 IN 1..1 INBOUND grandchild_node._id GRAPH @graph_name
                                FILTER edge3.label == 'subClassOf'
                                LIMIT 1 RETURN 1
                        ) > 0

                        RETURN { // Format grandchild (G)
                            _id: grandchild_node._id,
                            label: grandchild_node.label || grandchild_node.name || grandchild_node._key,
                            value: 1,
                            _hasChildren: grandchild_has_children,
                            children: null // Level N+3 not loaded here
                        }
                ) // Collect grandchildren (G) into an array for this child (C)

                // Check if the child_node (C) itself has children (G) loaded above
                LET child_has_children = COUNT(grandchildren) > 0

                RETURN { // Format child (C)
                    _id: child_node._id,
                    label: child_node.label || child_node.name || child_node._key,
                    value: 1,
                    _hasChildren: child_has_children, // Does C have children G?
                    children: grandchildren // Attach the array of grandchildren (G)
                }
        """
        bind_vars = {"parent_id": parent_id, "graph_name": GRAPH_NAME_ONTOLOGIES}
        print(f"DEBUG: Executing Child/Grandchild Query with bind_vars: {bind_vars}")
        # print(f"DEBUG: Query:\n{query_children_grandchildren}") # Uncomment to see full query if needed

        try:
            cursor = db_ontologies.aql.execute(query_children_grandchildren, bind_vars=bind_vars)
            results = list(cursor) # <<< Get results immediately
            print(f"DEBUG: Query executed. Number of children (C) found for {parent_id}: {len(results)}")
            if len(results) < 5: # Print details only if few results for clarity
                print(f"DEBUG: Raw child/grandchild results: {json.dumps(results, indent=2)}")
            else:
                print(f"DEBUG: Raw child/grandchild results (first 5): {json.dumps(results[:5], indent=2)}")

            # The results list *is* the data we need to return
            children_and_grandchildren_data = results

            print(f"DEBUG: Returning {len(children_and_grandchildren_data)} children nodes for {parent_id}.")
            return Response(children_and_grandchildren_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"ERROR: AQL Execution failed for children/grandchildren of {parent_id}: {e}")
            # You might want to inspect the specific ArangoDB error details if available in 'e'
            return Response({"error": f"Failed to fetch nested children data for {parent_id}."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    else:
        # === Fetch Initial Roots (Level 0) AND their Children (Level 1) ===
        print("DEBUG: Handling request for initial data (Root + L0 + L1).")
        initial_nodes_with_children = []
        graph_root_id = "root_nlm" # Unique ID for the artificial root

        # Loop through predefined starting nodes
        for node_id in INITIAL_ROOT_IDS:
            print(f"\nDEBUG: Processing initial root ID: {node_id}")

            # AQL Query: Fetches L0 node and its direct L1 children
            query_initial = """
                LET start_node_id = @node_id // This is L0

                // 1. Get the L0 node details
                LET start_node_doc = DOCUMENT(start_node_id)
                FILTER start_node_doc != null // Ensure L0 exists

                // 2. Check if L0 has children (L1)
                LET start_node_has_children = COUNT(
                    FOR c1, e1 IN 1..1 INBOUND start_node_id GRAPH @graph_name
                        FILTER e1.label == 'subClassOf' // <<< Check direction/label
                        LIMIT 1 RETURN 1
                ) > 0

                // 3. Get L1 children
                LET children_level1 = (
                    FOR child1_node, edge1 IN 1..1 INBOUND start_node_id GRAPH @graph_name
                        FILTER edge1.label == 'subClassOf' // <<< Check direction/label

                        // 4. Check if each L1 child has children (L2)
                        LET child1_has_children = COUNT(
                            FOR c2, e2 IN 1..1 INBOUND child1_node._id GRAPH @graph_name
                                FILTER e2.label == 'subClassOf' // <<< Check direction/label
                                LIMIT 1 RETURN 1
                        ) > 0

                        RETURN { // Format Level 1 node
                            _id: child1_node._id,
                            label: child1_node.label || child1_node.name || child1_node._key,
                            value: 1,
                            _hasChildren: child1_has_children, // Does L1 have L2 children?
                            children: null // L2 not loaded here
                        }
                ) // Collect L1 children into an array

                // 5. Return the formatted L0 node with its L1 children attached
                RETURN { // Format Level 0 node
                    _id: start_node_doc._id,
                    label: start_node_doc.label || start_node_doc.name || start_node_doc._key,
                    value: 1, // Could calculate SUM(children_level1[*].value) if needed
                    _hasChildren: start_node_has_children, // Does L0 have L1 children?
                    children: children_level1 // Attach array of formatted L1 children
                }
            """
            bind_vars = {"node_id": node_id, "graph_name": GRAPH_NAME_ONTOLOGIES}
            print(f"DEBUG: Executing Initial Query for {node_id} with bind_vars: {bind_vars}")
            # print(f"DEBUG: Query:\n{query_initial}") # Uncomment to see full query if needed

            try:
                cursor = db_ontologies.aql.execute(query_initial, bind_vars=bind_vars)
                # Expecting only one result document per initial node_id
                node_data_list = list(cursor)
                if node_data_list:
                    node_data = node_data_list[0]
                    print(f"DEBUG: Found initial data for {node_id}.")
                    # print(f"DEBUG: Raw data for {node_id}: {json.dumps(node_data, indent=2)}") # Uncomment for detailed view
                    initial_nodes_with_children.append(node_data)
                else:
                     print(f"WARNING: Initial query for {node_id} returned NO results. Check node existence and relationships.")

            except Exception as e:
                print(f"ERROR: AQL Execution failed for initial node {node_id}: {e}")
                # Decide if one failure should stop the whole initial load or just skip this node

        # Create the final top-level root node structure
        graph_root = {
            "_id": graph_root_id,
            "label": "NLM Cell Knowledge Network", # Or your preferred root label
            "_hasChildren": len(initial_nodes_with_children) > 0, # True if any L0 nodes were found
            "children": initial_nodes_with_children # Assign the list of L0 nodes (containing L1)
        }
        print(f"\nDEBUG: Finished processing initial nodes. Found {len(initial_nodes_with_children)} L0 nodes.")
        # print(f"DEBUG: Final graph_root structure: {json.dumps(graph_root, indent=2)}") # Uncomment for full structure view

        return Response(graph_root, status=status.HTTP_200_OK)
