# Print usage
usage() {
    cat << EOF

NAME
    deploy - Deploy a specified configuration of the Cell KN MVP

SYNOPSIS
    deploy [OPTIONS]

DESCRIPTION
    Deploy the Cell KN MVP by deploying the specified configuration in
    the conf directory. The corresponding site is first disabled, and
    ArangoDB container stopped. The Cell KN MVP repository is cloned
    into a versioned directory, Python and JavaScript dependencies
    installed, the Django application migrated, and the React
    application built. Then the configured ArangoDB archive is
    extracted, renamed, and symbolically linked using the specified
    port. The site configuration template is updated, then installed
    into the Apache sites-available directory, and the site enabled.

OPTIONS 
    -c    CONF
          The Cell KN configuration to deploy

    -h    Help

    -e    Exit immediately if a command returns a non-zero status

    -x    Print a trace of simple commands

EOF
}

# Parse command line options
while getopts ":c:hex" opt; do
    case $opt in
	c)
	    CONF=${OPTARG}
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

DOMAIN="cell-kn-mvp.org"

# List the configurations, and ensure only one default site exists
confs=$(ls conf/* | grep -v [~#])
if [ $(grep "IS_DEFAULT=1" $(ls conf/* | grep -v [~#]) | wc -l) != 1 ]; then
    echo "One site, and only one site, must be default"
    exit 0
fi

# Source the configuration to define CELL_KN_MVP_VERSION,
# ARANGO_DB_FILE, ARANGO_DB_PORT, SUBDOMAIN, IS_DEFAULT, SERVER_ADMIN
if [ -z "$CONF" ]; then
    echo "No configuration specified"
    exit 0
elif [ ! -f "conf/$CONF" ]; then
    echo "Configuration not found"
    printf "Available configurations:\\n$(ls conf/ | grep -v [~#])\n"
    exit 1
fi
. conf/$CONF

# Disable the corresponding site
site=$SUBDOMAIN-cell-kn-mvp.conf
sudo a2dissite $site
sleep 1

# Stop the corresponding ArangoDB container
../../arango_api/sh/stop-arangodb.sh

# Clone Cell KN MVP repository into a versioned directory
pushd ~
mvp_directory=springbok-cell-kn-mvp-$CELL_KN_MVP_VERSION
rm -rf $mvp_directory
git clone git@github.com:spearw/springbok-cell-kn-mvp.git $mvp_directory
popd

# Copy in the environment for the ArangoDB API
cp env/.env-$CELL_KN_MVP_VERSION ~/$mvp_directory/arango_api/.env
sed -i \
    "s/.*ARANGO_DB_HOST.*/ARANGO_DB_HOST=http:\/\/127.0.0.1:$ARANGO_DB_PORT/" \
    ~/$mvp_directory/arango_api/.env

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
if [ $IS_DEFAULT == 1 ]; then
    allowed_hosts="\"cell-kn-mvp.org\""
else
    allowed_hosts="\"$SUBDOMAIN.cell-kn-mvp.org\""
fi
sed -i \
    "s/.*ALLOWED_HOSTS.*/ALLOWED_HOSTS = [$allowed_hosts]/" \
    settings.py
popd
popd

# Extract, rename, and symbolically link the ArangoDB archive
pushd ~
arango_db_file=$(echo $ARANGO_DB_FILE | sed s/.tar.gz/-$CELL_KN_MVP_VERSION/)
arango_db_link=arangodb-$ARANGO_DB_PORT
rm -rf $arango_db_file
sudo rm -rf $arango_db_link
tar -zxvf $ARANGO_DB_FILE
mv arangodb $arango_db_file
sudo ln -sf $arango_db_file $arango_db_link
./start-arangodb.sh
popd
    
# Update, install, and enable the Apache site configuration
cat 000-default.conf | \
    sed s/{cell_kn_mvp_version}/$CELL_KN_MVP_VERSION/ | \
    sed s/{subdomain}/$SUBDOMAIN/ | \
    sed s/{server_admin}/$SERVER_ADMIN/ \
	> $site
if [ $IS_DEFAULT == 1 ]; then
    sed -i \
	"s/.*ServerName.*/    ServerName $DOMAIN/" \
	$site
fi
sudo cp $site /etc/apache2/sites-available
rm $site
sudo a2ensite $site
sudo systemctl restart apache2
sleep 1
