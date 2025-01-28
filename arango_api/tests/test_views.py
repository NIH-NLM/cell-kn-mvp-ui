from django.test import TestCase
from django.urls import reverse


class ViewsTestCase(TestCase):

    # TODO: Complete by setting up a test arangodb instance
    def test_list_collection_names(self):

        self.assertEqual(
            sorted(self.client.get(reverse("list_collection_names")).json()),
            sorted([
                "anatomic_structure_cls",
                "cell_set_ind",
                "PR",
                "NCBITaxon",
                "drug_product_cls",
                "GO",
                "CHEBI",
                "transcript_ind",
                "PATO",
                "gene_cls",
                "biomarker_combination_cls",
                "publication_ind",
                "UBERON",
                "biomarker_combination_ind",
                "transcript_cls",
                "publication_cls",
                "disease_cls",
                "CL",
            ]),
        )

    # TODO: Complete
    def test_list_by_collection(self):
        pass

    # TODO: Complete
    def test_get_object(self):
        pass

    # TODO: Complete
    def test_get_related_edges(self):
        pass

    # TODO: Complete
    def test_get_search_items(self):
        pass

    # TODO: Complete
    def test_get_graph(self):
        pass

    # TODO: Complete
    def test_get_all(self):
        pass

    # TODO: Complete
    def test_run_aql_query(self):
        pass

    # TODO: Complete
    def test_get_sunburst(self):
        pass
