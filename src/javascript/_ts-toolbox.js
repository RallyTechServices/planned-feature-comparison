Ext.define('Rally.technicalservices.Toolbox',{
    singleton: true,
    /**
     * Returns beginnig of month as date for the current time zone
     * 
     */
    getBeginningOfMonthAsDate: function(dateInMonth){
        var year = dateInMonth.getFullYear();
        var month = dateInMonth.getMonth();
        return new Date(year,month,1,0,0,0,0);
    },
    getEndOfMonthAsDate: function(dateInMonth){
        var year = dateInMonth.getFullYear();
        var month = dateInMonth.getMonth();
        var day = new Date(year, month+1,0).getDate();
        return new Date(year,month,day,0,0,0,0);
    },
    aggregateSnapsByOid: function(snaps){
        //Return a hash of objects (key=ObjectID) with all snapshots for the object
        var snaps_by_oid = {};
        Ext.each(snaps, function(snap){
            var oid = snap.ObjectID || snap.get('ObjectID');
            if (snaps_by_oid[oid] == undefined){
                snaps_by_oid[oid] = [];
            }
            snaps_by_oid[oid].push(snap);
            
        });
        return snaps_by_oid;
    },
    getCaseInsensitiveKey: function(obj, inputStr){
        var new_key = inputStr;
        Ext.Object.each(obj, function(key, val){
            if (new_key.toLowerCase() == key.toLowerCase()){
                new_key = key;  
            }
         });
        return new_key;

    },
    aggregateSnapsByOidForModel: function(snaps){
        //Return a hash of objects (key=ObjectID) with all snapshots for the object
        var snaps_by_oid = {};
        Ext.each(snaps, function(snap){
            var oid = snap.ObjectID || snap.get('ObjectID');
            if (snaps_by_oid[oid] == undefined){
                snaps_by_oid[oid] = [];
            }
            snaps_by_oid[oid].push(snap.getData());
            
        });
        return snaps_by_oid;
    },
    getDateBuckets: function(startDate, endDate, granularity){

        var bucketStartDate = Rally.technicalservices.Toolbox.getBeginningOfMonthAsDate(startDate);
        var bucketEndDate = Rally.technicalservices.Toolbox.getEndOfMonthAsDate(endDate);
       
        var date = bucketStartDate;
        
        var buckets = []; 
        while (date<bucketEndDate && bucketStartDate < bucketEndDate){
            buckets.push(date);
            date = Rally.util.DateTime.add(date,granularity,1);
        }
        return buckets;  
    },
    formatDateBuckets: function(buckets, dateFormat){
            var categories = [];
            Ext.each(buckets, function(bucket){
                categories.push(Rally.util.DateTime.format(bucket,dateFormat));
            });
            categories[categories.length-1] += "*"; 
            return categories; 
    },

    calculateStatistics: function(snapsByOid, releaseObjs){
        var release_field = 'c_CodeDeploymentSchedule';
        var feature_field = 'Feature';
        
        Ext.Object.each(snapsByOid, function(oid, snaps){
            Ext.Object.each(releaseObjs, function(release,obj){
                var snap = Rally.technicalservices.Toolbox.getSnapForDate(snaps, obj.start);
                if (snap && snap[release_field] == release){
                    obj.plannedArtifacts.push(snap);
                }
                var snap = Rally.technicalservices.Toolbox.getSnapForDate(snaps, obj.end);
                if (snap && snap[release_field] == release){
                    obj.endArtifacts.push(snap);
                }
            });
        });
        return releaseObjs;  
    },
    getSnapForDate: function(snaps, date){
        var val = null; 
        Ext.each(snaps, function(snap){
            var valid_to = Rally.util.DateTime.fromIsoString(snap._ValidTo);
            var valid_from = Rally.util.DateTime.fromIsoString(snap._ValidFrom)
            if (valid_to >= date && valid_from < date){
                val = snap; 
                return false; //Exit each loop
            }
        });
        return val; 
    }
 

});