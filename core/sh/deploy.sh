DOMAIN="cell-kn-mvp.org"

set -x

confs=$(ls conf/* | grep -v [~#])

if [ $(grep "IS_DEFAULT=1" $(ls conf/* | grep -v [~#]) | wc -l) != 1 ]; then
    echo "One site, and only one site, must be default"
    exit 0
fi

for conf in $confs; do

    . $conf

    pushd ~
    
    ./stop-arangodb.sh
    
    arango_db_file=$(echo $ARANGO_DB_FILE | sed s/.tar.gz/-$CELL_KN_MVP_VERSION/)
    arango_db_link=arangodb-$ARANGO_DB_PORT

    rm -rf $arango_db_file
    sudo rm -rf $arango_db_link

    tar -zxvf $ARANGO_DB_FILE
    mv arangodb $arango_db_file
    sudo ln -sf $arango_db_file $arango_db_link

    ./start-arangodb.sh

    popd
    
    SITE=$CELL_KN_MVP_VERSION-cell-kn-mvp.conf
    
    sudo a2dissite $SITE

    cat 000-default.conf | \
	sed s/{version}/$CELL_KN_MVP_VERSION/ | \
	sed s/{subdomain}/$SUBDOMAIN/ | \
	sed s/{server_admin}/$SERVER_ADMIN/ \
	    > $SITE

    sed -i \
	"s%.*ARANGO_DB_HOST.*%ARANGO_DB_HOST=http://127.0.0.1:$ARANGO_DB_PORT%" \
	~/springbok-cell-kn-mvp-$CELL_KN_MVP_VERSION/arango_api/.env

    if [ $IS_DEFAULT == 1 ]; then
	sudo sed -i "s/.*ServerName.*/    ServerName $DOMAIN/" $SITE
    fi

    sudo cp $SITE /etc/apache2/sites-available

    rm $SITE
    
    sudo a2ensite $SITE

    sudo systemctl reload apache2

done
