#!/opt/local/bin/bash

# Print usage
usage() {
    cat << EOF

NAME
    build - Build the Cell KN MVP ArangoDB archive

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
make_archive=0
force_archive=0
while getopts ":oOrRaAh" opt; do
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
        a)
            make_archive=1
            ;;
        A)
            force_archive=1
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

# TODO: Set in environment by requiring conf file argument
CELL_KN_ETL_ONTOLOGIES_VERSION="v0.1.1"
CELL_KN_ETL_RESULTS_VERSION="v0.3.0"

set -e

# Build ontology graph

pushd "../../cell-kn-etl-results/cell-kn-etl-ontologies"

if [ ! -f ".built" ] && [ $run_ontology == 1 ] \
       || [ $force_ontology == 1 ]; then

    pushd "src/main/shell"
    ./stop-arangodb.sh
    popd

    pushd "data"
    rm -rf arangodb
    popd

    pushd "src/main/shell"
    ./start-arangodb.sh
    popd

    current_branch=$(git branch --show-current)
    git stash
    git checkout $CELL_KN_ETL_ONTOLOGIES_VERSION

    mvn clean package -DskipTests

    classpath="target/cell-kn-etl-ontologies-1.0.jar"

    java -cp $classpath gov.nih.nlm.OntologyGraphBuilder

    git checkout $current_branch
    git stash apply

    log_message="Built cell-kn-etl-ontologies"
    log_message+=" using $CELL_KN_ETL_ONTOLOGIES_VERSION"
    log_message+=" on $(date)"

    echo $log_message > ".built"

fi

popd

# Build results and phenotype graphs

pushd "../../cell-kn-etl-results"

if [ ! -f ".built" ] && [ $run_results == 1 ] \
       || [ $force_results == 1 ]; then

    current_branch=$(git branch --show-current)
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

    classpath="target/cell-kn-etl-results-1.0.jar"
    classpath+=":cell-kn-etl-ontologies/target/cell-kn-etl-ontologies-1.0.jar"

    java -cp $classpath gov.nih.nlm.ResultsGraphBuilder
    java -cp $classpath gov.nih.nlm.PhenotypeGraphBuilder

    pushd src/main/python

    python CellKnSchemaUtilities.py

    popd

    deactivate

    git checkout $current_branch
    git stash apply

    log_message="Built cell-kn-etl-results"
    log_message+=" using $CELL_KN_ETL_RESULTS_VERSION"
    log_message+=" on $(date)"

    echo $log_message > ".built"

fi

popd

# Make ArangoDB archive

pushd "../../cell-kn-etl-results/cell-kn-etl-ontologies"

if [ ! -f ".archived" ] && [ $make_archive == 1 ] \
       || [ $force_archive == 1 ]; then

    pushd data

    archive="arangodb"
    archive+="-$CELL_KN_ETL_ONTOLOGIES_VERSION"
    archive+="-$CELL_KN_ETL_RESULTS_VERSION"
    archive+="-$(date "+%Y-%m-%d").tar.gz"

    tar -czvf $archive arangodb

    scp $archive mvp:~

    log_message="Archived ArangoDB using"
    log_message+=" $CELL_KN_ETL_ONTOLOGIES_VERSION"
    log_message+=" and $CELL_KN_ETL_RESULTS_VERSION"
    log_message+=" on $(date)"

    echo $log_message > ".archived"

    popd

fi

popd
