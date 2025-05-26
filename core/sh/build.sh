#!/opt/local/bin/bash

# Print usage
usage() {
    cat << EOF

NAME
    build - Build the Cell KN MVP ArangoDB archive

SYNOPSIS
    build [OPTIONS]

DESCRIPTION
    Build the Cell KN MVP by checking out the specified versions to
    build, making clean packages, building the ontology graph,
    fetching external data, building the results and phenotype graphs,
    archiving the ArangoDB database, and copying the archive to
    cell-kn-mvp.org. Changes on the current branches are stashed prior
    to checking out the specified versions, then applied on checking
    out the current version after the build.

OPTIONS 
    -o    CELL_KN_ETL_ONTOLOGIES_VERSION
          Build the specified version of the ontologies graph, if it
          does not exist

    -O    CELL_KN_ETL_ONTOLOGIES_VERSION
          Force -o

    -r    CELL_KN_ETL_RESULTS_VERSION
          Build the specified version of the results and phenotype
          graph, if they do not exist

    -R    CELL_KN_ETL_RESULTS_VERSION
          Force -r

    -h    Help

    -e    Exit immediately if a command returns a non-zero status

    -x    Print a trace of simple commands

EOF
}

# Parse command line options
run_ontology=0
force_ontology=0
run_results=0
force_results=0
make_archive=0
force_archive=0
while getopts ":o:O:r:R:aAhex" opt; do
    case $opt in
        o)
            run_ontology=1
	    CELL_KN_ETL_ONTOLOGIES_VERSION=${OPTARG}
            ;;
        O)
            force_ontology=1
	    CELL_KN_ETL_ONTOLOGIES_VERSION=${OPTARG}
            ;;
        r)
            run_results=1
	    CELL_KN_ETL_RESULTS_VERSION=${OPTARG}
            ;;
        R)
            force_results=1
	    CELL_KN_ETL_RESULTS_VERSION=${OPTARG}
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
	e)
	    set -e
	    ;;
	x)
	    set -x
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

# Build ontology graph, if specified
pushd "../../cell-kn-etl-results/cell-kn-etl-ontologies"
if [ ! -f ".built" ] && [ $run_ontology == 1 ] \
       || [ $force_ontology == 1 ]; then

    # Stop ArangoDB and remove the database
    pushd "src/main/shell"
    ./stop-arangodb.sh
    popd
    pushd "data"
    rm -rf arangodb
    popd
    pushd "src/main/shell"
    ./start-arangodb.sh
    popd

    # Stash changes, set the current branch, checkout the version to
    # build
    git stash
    current_branch=$(git branch --show-current)
    git checkout $CELL_KN_ETL_ONTOLOGIES_VERSION

    # Make a clean package, then build the ontology graph
    mvn clean package -DskipTests
    classpath="target/cell-kn-etl-ontologies-1.0.jar"
    java -cp $classpath gov.nih.nlm.OntologyGraphBuilder

    # Checkout the current branch, and apply the stash so that changes
    # are not lost
    git checkout $current_branch
    git stash apply

    # Log the build
    log_message="Built cell-kn-etl-ontologies"
    log_message+=" using $CELL_KN_ETL_ONTOLOGIES_VERSION"
    log_message+=" on $(date)"
    echo $log_message > ".built"

fi
popd

# Build results and phenotype graphs, if specified
pushd "../../cell-kn-etl-results"
if [ ! -f ".built" ] && [ $run_results == 1 ] \
       || [ $force_results == 1 ]; then

    # Stash changes, set the current branch, checkout the version to
    # build
    current_branch=$(git branch --show-current)
    git stash
    git checkout $CELL_KN_ETL_RESULTS_VERSION

    # Activate the Python environment, fetch external data, and write
    # all tuples. Note that the local .zshenv contains E-Utilities
    # credentials
    . .venv/bin/activate
    pushd src/main/python
    . .zshenv
    python ExternalApiResultsFetcher.py
    python NSForestResultsTupleWriter.py
    python AuthorToClResultsTupleWriter.py
    python ExternalApiResultsTupleWriter.py
    # TODO: Uncomment when complete
    # python AnnotationResultsTupleWriter.py
    popd

    # Make a clean package, then build the results and phenotype
    # graphs
    mvn clean package -DskipTests
    classpath="target/cell-kn-etl-results-1.0.jar"
    classpath+=":cell-kn-etl-ontologies/target/cell-kn-etl-ontologies-1.0.jar"
    java -cp $classpath gov.nih.nlm.ResultsGraphBuilder
    java -cp $classpath gov.nih.nlm.PhenotypeGraphBuilder

    # Create all analyzers and views, then deactivate the Python
    # environment
    pushd src/main/python
    python CellKnSchemaUtilities.py
    popd
    deactivate

    # Checkout the current branch, and apply the stash so that changes
    # are not lost
    git checkout $current_branch
    git stash apply

    # Log the build
    log_message="Built cell-kn-etl-results"
    log_message+=" using $CELL_KN_ETL_RESULTS_VERSION"
    log_message+=" on $(date)"
    echo $log_message > ".built"

fi
popd

# Make ArangoDB archive, if specified
pushd "../../cell-kn-etl-results/cell-kn-etl-ontologies"
if [ ! -f ".archived" ] && [ $make_archive == 1 ] \
       || [ $force_archive == 1 ]; then

    # Make the archive, and copy it to cell-kn-mvp.org
    pushd data
    archive="arangodb"
    archive+="-$CELL_KN_ETL_ONTOLOGIES_VERSION"
    archive+="-$CELL_KN_ETL_RESULTS_VERSION"
    archive+="-$(date "+%Y-%m-%d").tar.gz"
    tar -czvf $archive arangodb
    scp $archive mvp:~
    popd

    # Log the archive
    log_message="Archived ArangoDB using"
    log_message+=" $CELL_KN_ETL_ONTOLOGIES_VERSION"
    log_message+=" and $CELL_KN_ETL_RESULTS_VERSION"
    log_message+=" on $(date)"
    echo $log_message > ".archived"

fi
popd
