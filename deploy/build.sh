#!/opt/local/bin/bash

# Print usage
usage() {
    cat << EOF

NAME
    build - Build the Cell KN MVP

SYNOPSIS
    build

DESCRIPTION
    Build the Cell KN MVP.

OPTIONS 
    -h    Help

EOF
}

# Parse command line options
run_ontology=0
force_ontology=0
run_results=0
force_results=0
while getopts ":oOrRh" opt; do
    case $opt in
        o)
            run_ontology=1
            ;;
        O)
            force_ontology=1
            ;;
        r)
            run_results=1
            ;;
        R)
            force_results=1
            ;;
	h)
	    usage
	    exit 0
	    ;;
	\?)
	    echo "Invalid option: -${OPTARG}" >&2
	    usage
	    exit 1
	    ;;
	\:)
	    echo "Option -${OPTARG} requires an argument" >&2
	    usage
	    exit 1
	    ;;
    esac
done

# Parse command line arguments
shift `expr ${OPTIND} - 1`
if [ "$#" -ne 0 ]; then
    echo "No arguments required"
    exit 1
fi

CELL_KN_ETL_ONTOLOGIES_VERSION="v0.1.1"
CELL_KN_ETL_RESULTS_VERSION="v0.3.0"
SPRINGBOK_CELL_KN_MVP_VERSION="v0.3.0"

SPRINGBOK_CELL_KN_MVP_BRANCH="ralatsdc/add-build-and-deploy-scripts"

set -e

# Build ontology graph

pushd "../../cell-kn-etl-results/cell-kn-etl-ontologies"

if [ ! -f ".built" ] && [ $run_ontology == 1 ] || [ $force_ontology == 1 ]; then

    pushd "src/main/shell"
    ./stop-arangodb.sh
    popd

    pushd "data"
    rm -rf arangodb
    popd

    pushd "src/main/shell"
    ./start-arangodb.sh
    popd

    CURRENT_BRANCH=$(git branch --show-current)
    git stash
    git checkout $CELL_KN_ETL_ONTOLOGIES_VERSION

    mvn clean package -DskipTests
    CLASSPATH=target/cell-kn-etl-ontologies-1.0.jar
    java -cp $CLASSPATH gov.nih.nlm.OntologyGraphBuilder

    git checkout $CURRENT_BRANCH
    git stash apply

    echo "Built cell-kn-etl-ontologies $CELL_KN_ETL_ONTOLOGIES_VERSION on $(date)" > ".built"

fi

popd

# Build results and phenotype graphs

pushd "../../cell-kn-etl-results"

if [ ! -f ".built" ] && [ $run_results == 1 ] || [ $force_results == 1 ]; then

    CURRENT_BRANCH=$(git branch --show-current)
    git stash
    git checkout $CELL_KN_ETL_RESULTS_VERSION

    . .venv/bin/activate

    pushd src/main/python

    . .zshenv

    python ExternalApiResultsFetcher.py

    python NSForestResultsTupleWriter.py
    python AuthorToClResultsTupleWriter.py
    python ExternalApiResultsTupleWriter.py

    # python AnnotationResultsTupleWriter.py

    popd

    mvn clean package -DskipTests
    CLASSPATH=target/cell-kn-etl-results-1.0.jar
    CLASSPATH=$CLASSPATH:cell-kn-etl-ontologies/target/cell-kn-etl-ontologies-1.0.jar
    java -cp $CLASSPATH gov.nih.nlm.ResultsGraphBuilder

    pushd src/main/python

    python CellKnSchemaUtilities.py

    popd

    deactivate

    git checkout $CURRENT_BRANCH
    git stash apply

    echo "Built cell-kn-etl-results $CELL_KN_ETL_RESULTS_VERSION on $(date)" > ".built"

fi

popd

