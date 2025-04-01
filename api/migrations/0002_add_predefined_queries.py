from django.db import migrations


def create_predefined_queries(apps, schema_editor):
    PredefinedQuery = apps.get_model("api", "PredefinedQuery")

    PredefinedQuery.objects.create(
        name="Find gene-drug-disease triangles by publication",
        query="""
            LET node1 = DOCUMENT('PUB', 'doi.org-10.1038-s41467-023-40173-5')
            LET node2 = DOCUMENT('PUB', 'doi.org-10.1038-s41591-023-02327-2')
            RETURN { nodes: [node1, node2] }
        """,
        placeholder_1="doi.org-10.1038-s41467-023-40173-5",
        placeholder_2="doi.org-10.1038-s41591-023-02327-2",
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
                "UBERON",
            ],
            "labelStates": {
                ".collection-label": False,
                ".link-label": False,
                ".node-label": False,
            },
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_predefined_queries),
    ]
