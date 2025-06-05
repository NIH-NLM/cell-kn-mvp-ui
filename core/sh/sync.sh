# Print usage
usage() {
    cat << EOF

NAME
    sync - Synchronize enabled configurations of the Cell KN MVP

SYNOPSIS
    sync [OPTIONS]

DESCRIPTION
    Ensure only one default site exists, then update, install, and
    enable each Apache site configuration (much quicker).  If
    performing a clean synchronization [-C] (much slower), remove each
    disabled configuration, and deploy each enabled configuraion.

OPTIONS 
    -C    Synchronize by deploying each enabled Cell KN MVP configuration

    -h    Help

    -e    Exit immediately if a command returns a non-zero status

    -x    Print a trace of simple commands

EOF
}

# Parse command line options
do_clean=0
while getopts ":Chex" opt; do
    case $opt in
	C)
	    do_clean=1
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

if [ $do_clean == 0 ]; then

    # List the enabled configurations, ensure only one default site
    # exists
    enabled_confs=$(ls conf/* | grep -v [~#])
    if [ $(grep "IS_DEFAULT=1" $(ls conf/* | grep -v [~#]) | wc -l) != 1 ]; then
	echo "One site, and only one site, must be default"
	exit 0
    fi
    for conf in $enabled_confs; do

        # Source the configuration to define CELL_KN_MVP_UI_VERSION,
        # ARANGO_DB_FILE, ARANGO_DB_PORT, SUBDOMAIN, IS_DEFAULT,
        # SERVER_ADMIN
        . $conf

	# Update allowed hosts
	mvp_directory=cell-kn-mvp-ui-$CELL_KN_MVP_UI_VERSION
	pushd ~/$mvp_directory/core
	if [ $IS_DEFAULT == 1 ]; then
	    allowed_hosts="\"cell-kn-mvp.org\""
	else
	    allowed_hosts="\"$SUBDOMAIN.cell-kn-mvp.org\""
	fi
	sed -i \
	    "s/.*ALLOWED_HOSTS.*/ALLOWED_HOSTS = [$allowed_hosts]/" \
	    settings.py
	grep ALLOWED_HOSTS settings.py
	popd

	# Update, install, and enable the Apache site configuration
	site=$SUBDOMAIN-cell-kn-mvp.conf
	sudo a2dissite $site
	cat 000-default.conf | \
	    sed s/{cell_kn_mvp_ui_version}/$CELL_KN_MVP_UI_VERSION/ | \
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
	grep ServerName /etc/apache2/sites-available/$site
	sudo a2ensite $site

    done
    sudo systemctl restart apache2
    sleep 1
    
else

    # List the disabled configurations, then remove each
    disabled_confs=$(ls conf/.archive/* | grep -v [~#])
    for conf in $disabled_confs; do

        # Source the configuration to define CELL_KN_MVP_UI_VERSION,
        # ARANGO_DB_FILE, ARANGO_DB_PORT, SUBDOMAIN, IS_DEFAULT,
        # SERVER_ADMIN
        . $conf

        # Disable the corresponding site
        site=$SUBDOMAIN-cell-kn-mvp.conf
        sudo a2dissite $site
        sleep 1

        # Stop the corresponding ArangoDB container
        ../../arango_api/sh/stop-arangodb.sh

        # Remove Cell KN MVP versioned directory
        pushd ~
        mvp_directory=cell-kn-mvp-ui-$CELL_KN_MVP_UI_VERSION
        rm -rf $mvp_directory
        popd

        # Remove ArangoDB archive symbolic link
        sudo rm ~/arangodb-$ARANGO_DB_PORT

    done

    # List the enabled configurations, then deploy each
    enabled_confs=$(ls conf | grep -v [~#])
    for conf in $enabled_confs; do

        ./deploy.sh -c $conf

    done
fi
