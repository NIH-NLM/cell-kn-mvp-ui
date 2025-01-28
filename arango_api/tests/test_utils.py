import os
from pathlib import Path
import subprocess

from django.test import TestCase

from arango_api import utils


TESTS_DIR = Path(os.path.abspath(__file__)).parent
SH_DIR = TESTS_DIR.parent / "sh"
ARANGO_DB_HOME = os.environ["ARANGO_DB_HOME"]


class UtilsTestCase(TestCase):

    # @classmethod
    # def setUpClass(cls):

    #     subprocess.run([str(SH_DIR / "stop-arangodb.sh")])

    #     os.environ["ARANGO_DB_HOME"] = str(Path(TESTS_DIR / "arangodb"))

    #     subprocess.run([str(SH_DIR / "start-arangodb.sh")])


    def test_get_document_collections(self):

        self.assertEqual(
            sorted([c["name"] for c in utils.get_document_collections()]),
            sorted(
                [
                    "CHEBI",
                    "CL",
                    "GO",
                    "NCBITaxon",
                    "PATO",
                    "PR",
                    "UBERON",
                    "anatomic_structure",
                    "biomarker_combination",
                    "cell_set",
                    "disease",
                    "drug_product",
                    "gene_name",
                    "publication",
                ]
            ),
        )

    def test_get_all_by_collection(self):

        self.assertEqual(len(utils.get_all_by_collection("CL")), 3069)

    def test_get_by_id(self):

        self.assertEquals(
            utils.get_by_id("CL", "CL/0002145"),
            {
                "_key": "0002145",
                "_id": "CL/0002145",
                "_rev": "_iyGFlWW---",
                "term": "CL_0002145",
                "definition": [
                    "A multi-ciliated epithelial cell located in the trachea and bronchi, characterized by a columnar shape and motile cilia on its apical surface. These cilia facilitate mucociliary clearance by moving mucus and trapped particles toward the pharynx."
                ],
                "creation_date": "2010-08-24 03:38:29+00:00",
                "label": "ciliated columnar cell of tracheobronchial tree",
                "comment": [
                    "These cells possess numerous cilia on their surface, typically ranging from 200 to 300 per cell. The cilia vary in length, measuring between 6 to 7 μm in the upper airways (trachea) and becoming shorter, around 4 μm, in the smaller airways (terminal bronchioles). These cells form a two-layered 'coat' in the airway: the lower 'sol' layer is watery, allowing the cilia to beat in coordinated waves, while the upper 'gel' layer is thick and sticky, trapping inhaled particles."
                ],
                "hasDbXref": [
                    "FMA:70542",
                    "https://cellxgene.cziscience.com/cellguide/CL_0002145",
                    "PMID:28400610",
                    "GOC:tfm",
                    "DOI:10.1152/ajplung.00329.2019",
                    "DOI:10.1101/cshperspect.a028241",
                    "DOI:10.1146/annurev-physiol-021014-071931",
                    "DOI:10.1159/000196486",
                    "PMID:25386990",
                ],
                "proposed definition": "nan",
            },
        )

    def test_get_edges_by_id(self):

        self.assertEquals(
            list(utils.get_edges_by_id("CL-CL", "_from", "CL", "0000061")),
            [
                {
                    "_key": "0000061-0000151",
                    "_id": "CL-CL/0000061-0000151",
                    "_from": "CL/0000061",
                    "_to": "CL/0000151",
                    "_rev": "_iyDD1XS---",
                    "label": "subClassOf",
                },
                {
                    "_key": "0000061-0000062",
                    "_id": "CL-CL/0000061-0000062",
                    "_from": "CL/0000061",
                    "_to": "CL/0000062",
                    "_rev": "_iyDLvbC---",
                    "label": "subClassOf",
                },
                {
                    "_key": "0000061-0007002",
                    "_id": "CL-CL/0000061-0007002",
                    "_from": "CL/0000061",
                    "_to": "CL/0007002",
                    "_rev": "_iyDVrpW---",
                    "label": "develops from",
                },
            ],
        )

    # TODO: Complete
    def test_get_graph(self):
        pass

    # TODO: Complete
    def test_get_all(self):
        pass

    # TODO: Complete
    def test_search_by_term(self):
        pass

    # TODO: Complete
    def test_run_aql_query(self):
        pass

    # TODO: Complete
    def test_get_sunburst(self):
        pass

    # @classmethod
    # def tearDownClass(cls):

    #     subprocess.run([str(SH_DIR / "stop-arangodb.sh")])

    #     os.environ["ARANGO_DB_HOME"] = ARANGO_DB_HOME

    #     subprocess.run([str(SH_DIR / "start-arangodb.sh")])
