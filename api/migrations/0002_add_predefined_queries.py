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
        },
        {
            'name': 'Test Query',
            'query': """
                LET clList = (
                    FOR cl IN `CL-UBERON`
                        RETURN cl
                )
                RETURN clList
            """,
        },
    ]

    for query in queries:
        PredefinedQuery.objects.create(name=query['name'], query=query['query'])

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_predefined_queries),
    ]
