Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container', itemId: 'selector_box', layout: {type: 'hbox'}},    
        {xtype:'container',itemId:'run_box'},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],

    deploymentField: 'c_CodeDeploymentSchedule',
    deploymentModel: 'PortfolioItem/Feature',

    launch: function() {
        this._initialize();
    },
    _initialize: function(){
        var margin = 10;

        this.down('#selector_box').add({
            xtype: 'rallydatefield',
            fieldLabel: 'Start Date',
            itemId: 'dt-start'
        });

        this.down('#selector_box').add({
            xtype: 'rallyfieldvaluecombobox',
            itemId: 'cb-deployment',
            model: this.deploymentModel,
            field: this.deploymentField
        });
        
        this.down('#selector_box').add({
            xtype:'rallybutton',
            itemId: 'btn-run',
            text: 'Run',
            margin: margin,
            listeners: {
                scope: this,
                click: this._run
            }
        });
        this.down('#selector_box').add({
            xtype:'rallybutton',
            itemId: 'btn-export',
            disabled: true, 
            text: 'Export',
            margin: margin,
            listeners: {
                scope: this,
                click: this._export
            }
        });
    },
    _run: function(){
        this._setWorking(true); 
        this.logger.log('_run');

        var deploymentSchedule = this.down('#cb-deployment').getValue();
        var startDate = this.down('#dt-start').getValue();

        this._fetchFeatures(deploymentSchedule, startDate).then({
            scope: this,
            success: function(features){
                var store = this._createStore(features,startDate,deploymentSchedule);
                this._buildGrid(store);
            }
        }).always(function(){
            this._setWorking(false);
        }, this);
        
    },
    _export: function(){
        
    },
    _fetchFeatures: function(deploymentSchedule, startDate){
        var deferred = Ext.create('Deft.Deferred');
        
        var find = {};
        find['_TypeHierarchy'] = this.deploymentModel;
        find['$or'] = [{"__At": Rally.util.DateTime.toIsoString(startDate)},
                    {"__At": "current"}];

        fetch = ['FormattedID','Name',this.deploymentField,'_ValidTo','_ValidFrom'];

        Ext.create('Rally.data.lookback.SnapshotStore',{
            find: find,
            fetch: fetch,
            autoLoad: true,
            limit: 'Infinity',
            removeUnauthorizedSnapshots: true,
            listeners: {
                scope: this,
                load: function(store,records,success){
                    this.logger.log('_fetchFeatures load', success, records.length, records);
                    deferred.resolve(records);
                }
            }
        });
        return deferred;  
    },
    _getDeploymentFieldThen: function(){
        return this.deploymentField + '_then';
    },
    _createStore: function(records,startDate,deploymentSchedule){
        var snapsByOid = Rally.technicalservices.Toolbox.aggregateSnapsByOidForModel(records);
        var data = [];
        var deploymentField = this.deploymentField;
        var deploymentFieldThen = this._getDeploymentFieldThen();

        Ext.Object.each(snapsByOid, function(oid, snaps){
            var thenSnap = null;
            var nowSnap = null;
            var include =false;
            var name = null;
            var formattedID = null;
            Ext.each(snaps, function(snap){
                var validTo = Rally.util.DateTime.fromIsoString(snap._ValidTo);
                var validFrom = Rally.util.DateTime.fromIsoString(snap._ValidFrom);

                if (validFrom < startDate && validTo >= startDate){
                    thenSnap = snap;
                }
                if (validTo >= new Date()){
                    nowSnap = snap;
                }
                if (snap[deploymentField] === deploymentSchedule){
                    include = true;
                }
                formattedID = snap.FormattedID;
                name = snap.Name;
            });

            if (include){
                var rec = {FormattedID: formattedID, Name: name};
                rec[deploymentFieldThen] = null;
                rec[deploymentField] = null;
                if (thenSnap){
                    rec[deploymentFieldThen] = thenSnap[deploymentField];
                }
                if (nowSnap){
                    rec[deploymentField] = nowSnap[deploymentField];
                }
                data.push(rec);
            }
        }, this);

        var store = Ext.create('Rally.data.custom.Store',{
            data: data
        });
        return store;
    },
    _buildGrid: function(store){

        if (this.down('rallygrid')){
            this.down('rallygrid').destroy();
        }
        this.down('#display_box').add({
            xtype: 'rallygrid',
            store: store,
            columnCfgs: [{
                text: 'FormattedID',
                dataIndex: 'FormattedID'
            },{
                text: 'Name',
                dataIndex: 'Name',
                flex: 1
            },{
                text: 'Deployment (Start Date)',
                dataIndex: this._getDeploymentFieldThen(),
                flex: 1
            },{
                text: 'Deployment (Today)',
                dataIndex: this.deploymentField,
                flex: 1
            }]
        });
    },
   _setWorking: function(isWorking){
        this.setLoading(isWorking);
        this.down('#btn-export').setDisabled(isWorking);
        this.down('#btn-run').setDisabled(isWorking);
    }
});