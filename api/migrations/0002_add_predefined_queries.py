from django.db import migrations

def create_predefined_queries(apps, schema_editor):
    PredefinedQuery = apps.get_model('api', 'PredefinedQuery')

    queries = [
        {
            'name': 'Search for CL vertices by finding text in NCBITaxon and UBERON vertices',
            'query': """
                LET searchResults = (
                  FOR doc IN UBERON
                    FILTER CONTAINS(LOWER(doc.label), LOWER(@term)) OR CONTAINS(LOWER(doc.definition), LOWER(@term))
                    RETURN doc
                )

                LET clList = (
                  FOR doc IN searchResults
                    FOR cl IN ANY doc._id `CL-UBERON`
                      RETURN cl
                )

                LET ncbiTaxonId = ( FOR taxon IN NCBITaxon FILTER CONTAINS(LOWER(taxon.label), LOWER(@ncbiTerm)) OR 
                CONTAINS(LOWER(taxon.term), LOWER(@ncbiTerm)) LIMIT 1 RETURN taxon._id ) 

                LET filteredCLs = (
                  FOR cl IN clList
                    FOR NCBITaxon IN ANY cl._id `CL-NCBITaxon`
                      FILTER NCBITaxon._id == FIRST(ncbiTaxonId)
                      RETURN cl
                )

                RETURN { nodes: filteredCLs}
                """,
            'placeholder_1': 'Enter text to find in NCBITaxon vertices...',
            'placeholder_2': 'Enter text to find in UBERON vertices...',
            'settings': '{}',
        },
        {
            'name': 'Find gene-drug-disease triangles by publication',
            'query': """
                LET node1 = DOCUMENT('publication', 'HLCA_2023_Sikkema')
                LET node2 = DOCUMENT('publication', 'cellRef_2023_Guo')
                RETURN { nodes: [node1, node2] }
            """,
            'placeholder_1': 'HLCA_2023_Sikkema',
            'placeholder_2': 'cellRef_2023_Guo',
            'settings': '{initialDepth: 2}',
        },
    ]

    for query in queries:
        PredefinedQuery.objects.create(
            name=query['name'],
            query=query['query'],
            placeholder_1=query['placeholder_1'],
            placeholder_2=query['placeholder_2'],
            settings=query['settings']
        )

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_predefined_queries),
    ]