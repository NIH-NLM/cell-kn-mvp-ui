from django.db import migrations

def create_predefined_queries(apps, schema_editor):
    PredefinedQuery = apps.get_model('api', 'PredefinedQuery')

    PredefinedQuery.objects.create(
        name="Find gene-drug-disease triangles by publication",
        query="""
            LET node1 = DOCUMENT('publication', 'HLCA_2023_Sikkema')
            LET node2 = DOCUMENT('publication', 'cellRef_2023_Guo')
            RETURN { nodes: [node1, node2] }
        """,
        placeholder_1="HLCA_2023_Sikkema",
        placeholder_2="cellRef_2023_Guo",
        settings={
            "defaultDepth": 3,
            "setOperation": "Union",
            "collectionsToPrune": [
                "anatomic_structure",
                "biomarker_combination",
                "CHEBI",
                "CL",
                "GO",
                "NCBITaxon",
                "PATO",
                "PR",
                "UBERON"
                ],
            "labelStates":
                {".collection-label": False, ".link-label": False, ".node-label": False}
        }
    )

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_predefined_queries),
    ]