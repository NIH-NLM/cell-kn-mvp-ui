import os
from pathlib import Path
import subprocess

from django.test import TestCase
from django.urls import reverse


TESTS_DIR = Path(os.path.abspath(__file__)).parent
SH_DIR = TESTS_DIR.parent / "sh"
ARANGO_DB_HOME = os.environ["ARANGO_DB_HOME"]


class ViewsTestCase(TestCase):

    @classmethod
    def setUpClass(cls):

        subprocess.run([str(SH_DIR / "stop-arangodb.sh")])
        os.environ["ARANGO_DB_HOME"] = str(Path(TESTS_DIR / "arangodb"))
        subprocess.run([str(SH_DIR / "start-arangodb.sh")])

    def test_list_collection_names(self):

        self.assertEqual(
            sorted(self.client.get(reverse("list_collection_names")).json()),
            sorted(
                [
                    "CHEBI",
                    "CL",
                    "GO",
                    "NCBITaxon",
                    "PATO",
                    "PR",
                    "UBERON",
                    "anatomic_structure_cls",
                    "biomarker_combination_cls",
                    "biomarker_combination_ind",
                    "cell_set_ind",
                    "disease_cls",
                    "drug_product_cls",
                    "gene_cls",
                    "publication_cls",
                    "publication_ind",
                    "transcript_cls",
                    "transcript_ind",
                ]
            ),
        )

    def test_list_by_collection(self):

        self.assertEqual(
            self.client.get(
                reverse("list_by_collection", kwargs={"coll": "publication_ind"})
            ).json(),
            [
                {
                    "_key": "Sikkema-et-al-2023-Nat-Med",
                    "_id": "publication_ind/Sikkema-et-al-2023-Nat-Med",
                    "_rev": "_jEEOfmq---",
                    "label": "HLCA",
                    "citation": "Sikkema, L., Ramírez-Suástegui, C., Strobl, D.C. et al. An integrated cell atlas of the lung in health and disease. Nat Med 29, 1563–1577 (2023).",
                    "DOI": "https://doi.org/10.1038/s41591-023-02327-2",
                },
                {
                    "_key": "Guo-et-al-2023-Nat-Commun",
                    "_id": "publication_ind/Guo-et-al-2023-Nat-Commun",
                    "_rev": "_jEEOfm2---",
                    "label": "CellRef",
                    "citation": "Guo, M., Morley, M.P., Jiang, C. et al. Guided construction of single cell reference for human and mouse lung. Nat Commun 14, 4566 (2023).",
                    "DOI": "https://doi.org/10.1038/s41467-023-40173-5",
                },
            ],
        )

    def test_get_object(self):

        self.assertEqual(
            self.client.get(
                reverse(
                    "get_object",
                    kwargs={
                        "coll": "publication_ind",
                        "pk": "Sikkema-et-al-2023-Nat-Med",
                    },
                )
            ).json(),
            {
                "_key": "Sikkema-et-al-2023-Nat-Med",
                "_id": "publication_ind/Sikkema-et-al-2023-Nat-Med",
                "_rev": "_jEEOfmq---",
                "label": "HLCA",
                "citation": "Sikkema, L., Ramírez-Suástegui, C., Strobl, D.C. et al. An integrated cell atlas of the lung in health and disease. Nat Med 29, 1563–1577 (2023).",
                "DOI": "https://doi.org/10.1038/s41591-023-02327-2",
            },
        )

    # TODO: Complete
    def test_get_related_edges(self):
        pass

    def test_get_search_items(self):

        self.assertEqual(
            self.client.get(reverse("get_search_items", kwargs={"st": "at1"})).json(),
            {
                "anatomic_structure_cls": [],
                "cell_set_ind": [
                    {
                        "_key": "hlca-h4pclnit",
                        "_id": "cell_set_ind/hlca-h4pclnit",
                        "_rev": "_jEEOkhe---",
                        "label": "AT1",
                    }
                ],
                "PR": [],
                "NCBITaxon": [],
                "drug_product_cls": [],
                "GO": [],
                "CHEBI": [],
                "transcript_ind": [],
                "PATO": [],
                "gene_cls": [],
                "biomarker_combination_cls": [],
                "publication_ind": [],
                "UBERON": [],
                "biomarker_combination_ind": [],
                "transcript_cls": [],
                "publication_cls": [],
                "CL": [],
                "disease_cls": [],
            },
        )

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

    @classmethod
    def tearDownClass(cls):

        subprocess.run([str(SH_DIR / "stop-arangodb.sh")])
        os.environ["ARANGO_DB_HOME"] = ARANGO_DB_HOME
        subprocess.run([str(SH_DIR / "start-arangodb.sh")])
