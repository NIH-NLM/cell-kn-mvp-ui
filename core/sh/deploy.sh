# Print usage
usage() {
    cat << EOF

NAME
    deploy - Deploy Cell KN MVP

SYNOPSIS
    deploy [OPTIONS]

DESCRIPTION
    Deploy the Cell KN MVP by deploying each configuration in the conf
    directory. All sites are first disabled, and all ArangoDB
    instances stopped. The Cell KN MVP repository is cloned into a
    versioned directory, Python and JavaScript dependencies installed,
    the Django application migrated, and the React application
    built. Then the configured ArangoDB archive is extracted, renamed,
    and symbolically linked using the specified port. The site
    configuration template is updated, then installed into the Apache
    sites-available directory, and the site enabled.

OPTIONS 
    -h    Help

    -e    Exit immediately if a command returns a non-zero status

    -x    Print a trace of simple commands

EOF
}

# Parse command line options
while getopts ":hex" opt; do
    case $opt in
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

DOMAIN="cell-kn-mvp.org"

# Disable all enabled sites
sites=$(ls /etc/apache2/sites-enabled)
for site in $sites; do
    sudo a2dissite $site
    sleep 1
done

# Stop all ArangoDB containers
ports=$(docker ps | grep arangodb | cut -d "-" -f 4)
for port in $ports; do
    ARANGO_DB_PORT=$port ../../arango_api/sh/stop-arangodb.sh
done

# List the configurations, and ensure only one default exists
confs=$(ls conf/* | grep -v [~#])
if [ $(grep "IS_DEFAULT=1" $(ls conf/* | grep -v [~#]) | wc -l) != 1 ]; then
    echo "One site, and only one site, must be default"
    exit 0
fi
for conf in $confs; do

    # Source the configuration to define CELL_KN_MVP_VERSION,
    # DEPLOYED_AS_VERSION, ARANGO_DB_FILE, ARANGO_DB_PORT, SUBDOMAIN,
    # IS_DEFAULT, SERVER_ADMIN
    . $conf

    # Clone Cell KN MVP repository into a versioned directory
    pushd ~
    mvp_directory=springbok-cell-kn-mvp-$DEPLOYED_AS_VERSION
    rm -rf $mvp_directory
    git clone git@github.com:spearw/springbok-cell-kn-mvp.git $mvp_directory
    popd

    # Copy in the environment for the ArangoDB API
    cp env/.env-$DEPLOYED_AS_VERSION ~/$mvp_directory/arango_api/.env

    # Checkout the specified CELL KN MVP version
    pushd ~/$mvp_directory
    git checkout $CELL_KN_MVP_VERSION

    # Install Python dependencies, and migrate
    python3.13 -m venv .venv
    . .venv/bin/activate
    python -m pip install -r requirements.txt
    rm -f db.sqlite3
    python manage.py migrate

    # Install JavaScript dependencies, and build
    pushd react
    npm install
    npm run build
    popd
    deactivate

    # Update allowed hosts
    pushd core
    sed -i \
	's/.*ALLOWED_HOSTS.*/ALLOWED_HOSTS = ["cell-kn-mvp.org", ".cell-kn-mvp.org"]/' \
	settings.py
    popd
    popd

    # Extract, rename, and symbolically link the ArangoDB archive
    pushd ~
    arango_db_file=$(echo $ARANGO_DB_FILE | sed s/.tar.gz/-$DEPLOYED_AS_VERSION/)
    arango_db_link=arangodb-$ARANGO_DB_PORT
    rm -rf $arango_db_file
    sudo rm -rf $arango_db_link
    tar -zxvf $ARANGO_DB_FILE
    mv arangodb $arango_db_file
    sudo ln -sf $arango_db_file $arango_db_link
    ./start-arangodb.sh
    popd
    
    # Update, install, and enable the Apache site configuration
    SITE=$DEPLOYED_AS_VERSION-cell-kn-mvp.conf
    cat 000-default.conf | \
	sed s/{deployed_as_version}/$DEPLOYED_AS_VERSION/ | \
	sed s/{subdomain}/$SUBDOMAIN/ | \
	sed s/{server_admin}/$SERVER_ADMIN/ \
	    > $SITE
    if [ $IS_DEFAULT == 1 ]; then
	sed -i "s/.*ServerName.*/    ServerName $DOMAIN/" $SITE
    fi
    sudo cp $SITE /etc/apache2/sites-available
    rm $SITE
    sudo a2ensite $SITE
    sudo systemctl reload apache2
    sleep 1

done
