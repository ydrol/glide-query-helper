/** ES6+ Script
 * 
 * JSDoc generated using jsdoc -d=./docs/ ScriptUtils_QueryHelper.js

 * @typedef {string} EncodedQueryString Encoded Query
 *
 * @typedef {string} TableName e.g. cmdb_ci
 *
 * @typedef {string} FieldName e.g. sys_id

 * @typedef {string} QueryValue e.g. any string also 'NULL' and 'NOT NULL' are special

 * @typedef {string} FieldValue any string

 * @typedef {string} DotWalkFieldName e.g. parent.sys_id
 *
 * @typedef {[DotWalkFieldName,QueryValue]} WhereEquals
 * @typedef {[DotWalkFieldName,Op,QueryValue]} WhereOp
 * @typedef {(EncodedQueryString|WhereEquals|WhereOp)} AddQueryArgs
 * 
 * structure for user input e.g. { and: listOfConditions }
 * @typedef {string} BoolOp - and|or|where?
 * @typedef {Object<BoolOp,ConditionList>} AndOrCondition
 * @typedef {(AddQueryArgs|AndOrCondition)} Condition
 * @typedef {Condition[]} ConditionList

 * @typedef {Object} ConditionNodeInternal - { op:'and|or', list: listOfConditions } internal representation of  {and: listOfConditions } - for easier traversal
 * @typedef {string} ConditionNodeInternal.op - 'and|or'
 * @typedef {ConditionList} ConditionNodeInternal.list - list of conditions 
 * @typedef {(GlideRecord|GlideQueryCondition)} ConditionNodeInternal.gTarget - Target GlideObject - either root GlideRecord or GlideQueryCondition
 * @typedef {(GlideRecord|GlideQueryCondition)} ConditionNodeInternal.gFunction - Function used to add the conditions (addQuery | addCondition | addOrCondition - determined by op and gTarget.
 * 
 * @typedef {Object.<FieldName,FieldValue>} RowResultFieldValues
 *
 * @typedef {(FieldName|DotWalkFieldName)} SelectItemSimple
 *
 * @typedef {(SelectItemSimple|Object.<FieldName,FieldName[]>)} SelectItem
 *
 * @typedef {(SelectItem|SelectItem[])}  SelectList
 *   
 * @typedef {Object} QueryDef 
 * @property {SelectList}           QueryDef.select - if one string return is string[] else RowResultFieldValues[]
 * @property {TableName}            QueryDef.from 
 * @property {ConditionList}             QueryDef.where 
 * @property {integer}              QueryDef.limit 
 * @property {FieldName[]}          QueryDef.orderBy 
    */

/**
 * @class ScriptUtils_QueryHelper
 * 
 * 
 *@example
    {
        select: [ parent , parent.sys_class_name , child.correlation_id ],
        from: 'cmdb_rel_ci',
        where: [
                [ 'type' : 'some sysid' ],
                [ "parent.sys_class_name" , 'cmdb_ci_hardware' ],
                { or: [
                    [ "child.model_id.name" , 'MODEL1' ] ,
                    [ "child.model_id.name" , 'MODEL2' ] 
                  ]
                }
            ]
        where: {or: [] }
        where: {and: [] }

            // addJoinQuery(table2, field , table2field ).addQuery('state','3')
            [ "field" : {
                select: table2field,
                from: table2,
                where: [
                    ['state' , 3 ]
                ]
                }
            ]
            // RLQUERY
            [ {
                    type: 'RLQUERY',
                    table: t2,
                    field: f2
                    where: [
                        ['state' , 3 ]
                    ]
                } , '>' , 0 ]
                              
        ]
        orderBy: fieldName,
        orderByDesc: fieldNames
        limit: n
    }

    returns :
     [
          { sys_id: "...", parent: { sys_id:"..", sys_class_name:"..." } , child: { sys_id:"..", correlation_id:"..."} }
     ]

     It is not streaming, it does NOT support function calls for each row, it fetches ALL results.
     Joins are implicit via dot.walked fields.

     Notes: 
     SQL was probably prohibited for security reasons , and functionality as it doesnt use the class model.
     Unknown fields were probably dropped from the Glide query to simplify queries at different class levels?

     Notes:
     addJoinTable 
     
          creates  a sub query place holder (CHILD IN PLACEHOLDER) - use case is filtering on documentId fields.

     addExtraField
          addExtraField('child.xxx) appears to also fetch name, sys_class_name, sys_id 
     it makes no difference to the encoded query on the GR. 
     It does NOT return error status to application but is ignored. (error is logged but not flagged in calling code) typical SN)

     To verify if a dot.walked field will force a DB query check if the propery exists before accessing it
     (NB it looks like GlideRecord is now more opaque and lo longer exposes internal methods at the field level)

     So fetched = ('sys_id' in gr.child );

 */

var ScriptUtils_QueryHelper = Class.create();
ScriptUtils_QueryHelper.prototype = /** @lends ScriptUtils_QueryHelper.prototype */ {
    initialize: function() {
        // Define settings within the instance not the prototype
        this.ADD_EXTRA_FIELDS = true;
    },

    /**
     *  Enable/Disable addExtraFields() - default enable - mainly for testing
     * @param {boolean} onOff 
     */
    autoAddExtraFields: function(onOff) {
        this.ADD_EXTRA_FIELDS = !!onOff;
        this._logInfo('add extra fields = {0}',this.ADD_EXTRA_FIELDS);

    },

    /**
     * Query items and return fields 
     * Any dot-walked Fields in the select list are fetched during the query using addExtraField()
     * @param {object} queryDef 
 * @param {SelectList}           QueryDef.select - if one string return is string[] else RowResultFieldValues[]
 * @param {TableName}            QueryDef.from 
 * @param {ConditionList}             QueryDef.where 
 * @param {integer}              QueryDef.limit 
 * @param {FieldName[]}          QueryDef.orderBy 
 * @returns {string[]|RowResultFieldValues[]} Returns rows - either single vals 
 * 
 * @example
    let q = {
        select : [ 'user.name', 'user.last_name', 'group.name' ],
        from : 'sys_user_grmember',
        where: [
            [ 'user.first_name' , 'IN',  'Alex,John'  ]
            [ 'user.first_name' , ['Alex','John']  ] // Arrays can be passed directly - this is the same as above
        ]
    }
     let api = new ScriptUtils_QueryHelper();
     let rows = api.queryAll(q);
     for(r of rows) {
        gs.info(JSON.stringify(r));
        gs.info(r.user.last_name);
     }

     OUTPUT:
     {"sys_id":"44c85601d7b3020058c92cf65e6103e1","user":{"sys_id":"ff969201d7b3020058c92cf65e61036d","last_name":"Ray"}}
     Ray
    {"sys_id":"7c4c2495d703120058c92cf65e6103d5","user":{"sys_id":"36e1e015d703120058c92cf65e6103eb","last_name":"McGibbon"}}
     McGibbon
    
     TODO where is group name
    */
    queryAll: function( /** {QueryDef} */ queryDef  ) {

        var self = this;

        let parts = new Set(['select','from','where','orderBy','orderByDesc','limit']);
        let unknown = this.arrayDifference(Object.keys(queryDef),parts);
        if (unknown.length) {
            throw new Error('unknown fields '+unknown.join());
        }

        /**
         * Get the table that a GlideRecord or GlideElement refers to.
         * @param {GlideElement} elem 
         * @returns 
         */
        function elementTable(elem) {

            let t = elem.getReferenceTable();
            if (t === undefined ) {
                t = elem.getTableName();
            }
            return t;
        }

        /**
         * get values from the row and output a row object
         * @param {GlideRecord} any_gr 
         * @param {RowResultFieldValues} rowTemplate  field names to return
         * @returns {RowResultFieldValues} field values
         */
        function buildRow(any_gr,rowTemplate) {

            let result = {};

            function mergeCols(target,source_gr,template ) {

                for(let fld in template) {
                    
                    //let elemOK = fld in source_gr;
                    let elemOK = source_gr[fld] !== undefined;

                    if (!elemOK) {
                        self._logInfo('{0} = {1}',fld,source_gr[fld]);

                        throw new Error(fld+' not found in '+elementTable(source_gr));
                    }

                    if (template[fld] === true) {

                        target[fld] = source_gr[fld].getValue();

                    } else {

                        if (!target[fld]) target[fld] = {};

                        mergeCols(target[fld] , source_gr[fld] , template[fld]);
                    }
                }
            }
            
            mergeCols(result, any_gr , rowTemplate  );

            return result;
        }

        /**
         * Convert list of field selectors to row template structure.
         * This will be the same as a row except values are 'true'
         * 
         *  Convert [ 'fld0', 'ref1.ref2.fld' , 'ref1.ref3' ]  => {
         *      fld0: true, 
         *      ref1: { 
         *          ref2: { fld: true },
         *          ref3: true
         *      }
         *  }
         * @param {SelectItemSimple[]} flattenedSelectFields 
         * @returns {RowResultFieldValues}
         */
        function buildRowTemplate(flattenedSelectFields) {
            
            // Add ref1.ref2.fld => { ref1: { ref2: { fld: true }}}

            function defaultCols() {
                return {
                    sys_id: true 
                    // ,sys_class_name: true 
                };
            }

            /**
             * Build a row template (same as a rowResult but with all values = true )
             * eg { sys_id: true , caller : { sys_id: true }}
             * @param {DotWalkFieldName} dotfield 
             * @param {RowResultFieldValues} template 
             */
            function addColumn(dotfield,template) {
                let parts = dotfield.split('.');
                let last = parts.pop();
                let t = template;
                for(let part of parts) {

                    if (!(part in t) ) {

                        t[part] = defaultCols();
                    }

                    t = t[part];
                }
                t[last] = true;
            }

            let template = defaultCols();

            for(let dotfield of flattenedSelectFields ) {
                addColumn(dotfield,template);
            }
            return template;
        }
        /**
         * Apply the where object to the Glide object.
         * It will be validated just before the query is executed
         * as some fields might be DotWalkFieldName
         * @param {GlideRecord} start_gr 
         * @param {ConditionList} conditionList - list of conditions
         */
        function applyQuery(start_gr,conditionList) {

            /**
             * 
             * @param {(GlideRecord|GlideQueryCondition)} glideRecordOrCondition 
             * @param {function} addFunction addQuery or addCondition or addOrCondition
             * @param {object[]} clause one,two or three args passed to addQuery
             */
            function applyClause(parentNode,childNode) {

                if (false && typeof clause === 'string' ) {
                    // Dont alow strings
                    return addFunction.apply(glideRecordOrCondition,clause);

                } else if (Array.isArray(clause)) {

                    if (clause.length < 1 || clause.length > 3 ) {

                        throw new Error('Invalid clause '+JSON.stringify(clause));

                    } else {

                        if (clause.length === 2 && Array.isArray(clause[1])) {

                            return parentNode.gFunction.call(parentNode.gTarget,clause[0],'IN',clause[1].join());

                        } else {

                            return parentNode.gFunction.apply(parentNode.gTarget,clause);
                        }
                    }
                } else if (typeof clause === 'object') {

                    let gTarget = ????;

                    if (clause.and) {

                        return createConditionApplyClauses(glideRecordOrCondition,'and',clause.and);

                    } else if (clause.or) {

                        return createConditionApplyClauses(glideRecordOrCondition,'or',clause.or);
                    } else {
                        throw new Error('expected and/or property');
                    }
                } else {
                    throw new Error('clause must be encodedString or [field,val] or [field,op,val] or { and: [ ... ] } or { or: [ ... ] } '+JSON.stringify(clause));
                }
            }

            function getAddFunction(glideRecordOrCondition,opKeyword_WhereAndOr) {

                let addFunctionName;

                if (glideRecordOrCondition === start_gr ) {
                    if (opKeyword_WhereAndOr !== 'where') throw new Error('expected "where" keyword');
                    addFunctionName = 'addQuery';
                } else if (opKeyword_WhereAndOr === 'and') {
                    addFunctionName = 'addCondition';
                } else {
                    addFunctionName = 'addOrCondition';
                }
                if (glideRecordOrCondition[addFunctionName] === undefined) {
                    throw new Error('unable to find function '+addFunctionName);
                }
                return glideRecordOrCondition[addFunctionName];
            }

            /**
             * The SN API builds the following:
             * 
             * top level WHERE
             * 
             * gr.addQuery();
             * gr.addQuery();
             * gr.addQuery();
             * 
             * { where: [....]}
             * 
             * top level AND
             * cond.addCondition();
             * cond.addCondition();
             * cond.addCondition();
             * 
             * top level OR
             * gr.addQuery().addOrCondition().addOrCondition()
             * { where: [ ...,  {or: [ ..... ]} , ....]}
             * 
             * cond.addOrCondition();
             * cond.addOrCondition();
             * cond.addOrCondition();
             * 
             * @param {*} startGR 
             * @param {*} clauseList 
             */
            function applyClausesToGR(start_gr,conditionNode) {

                conditionNode.gTarget = start_gr;
                conditionNode.gFunction = start_gr.addQuery;

                for (let clause of conditionNode.clauses) {

                    applyClause(conditionNode,clause);

                }
            }

            function createConditionApplyClauses(parentRecordOrCondition,opKeyword_WhereAndOr,clauseList) {

                // TODO
                let addQueryConditionFn = getAddFunction(parentRecordOrCondition,opKeyword_WhereAndOr);

                let target;
                let firstCondition;
                

                let firstClause = clauseList.shift();
                firstCondition = applyClause(parentRecordOrCondition,addQueryConditionFn,clause);

                for (let clause of clauseList) {

                    applyClause(parentRecordOrCondition,addQueryConditionFn,clause);

                }
                return firstCondition;
            }
            /**
             * 
             * @param {Object.<string,ConditionList>} conditionObj 
             */
            function convertConditionTree(conditionObj) {

                let node = {
                    op: null , // and|or 
                    gTarget: null , // GlideRecord | GlideQueryCondition
                    gFunction:null ,  // addQuery | addCondition | addOrCondition
                    clauses: []};
                
                    let clauses;
                if (conditionObj.and !== undefined) {
                    node.op = 'and'
                    clauses = conditionObj.and;
                } else if (conditionObj.or !== undefined) {
                    node.op = 'or' 
                    clauses = conditionObj.or;
                };
                if (typeof clauses == 'string') {
                    // Single encoded query?
                    clauses = [ clauses ];
                }
                for (let clause of clauses ) {

                    if (typeof clause === 'string' ) {
                        node.clauses.push( [ clause ]); // single encoded query?

                    } else if (Array.isArray(clause)) {
                        node.clauses.push( clause ); // Array for addQuery args 

                    }

                }

                return node;

            }

            // We'll be tracking GlideQueryCondition inside a copy of the object.
            let conditionNode = convertConditionTree( { and: conditionList } );

            applyClausesToGR(conditionNode);
        }

        /**
         * Call gr.addExtraField() to fetch related columns during the inital select.
         * Then these fields can be access via dot walk after gr.next()
         * The code is not any differen but the record fields have been pre-fetched
         * so the dot-walk does not trigger an additional DB query.
         * 
         * addExtraField is new with Washington
         * 
         * if the select contains either a dotWalk field e.g. 'referenceName.name'
         * or an object with an array Property e.g. { referenceName: ['name', 'sys_id'] }
         * see SelectList
         * 
         * By default it also adds the following related fields from the related table.
         * - reference.sys_id
         * - reference.name
         * - reference.sys_class_name
         * 
         * If an invalid field is added, this is logged by servicenow but no error is 
         * returned to the application. Instead after the main record is fetched -
         * we can verify that the record has been pre-fetched using..
         
        gr.addExtraField('reference.someField');

        * while(gr.next()) {
        *   if (!('someField' in gr.reference )) {
        *      gs.warn('field was not prefetched');
        *   }
        *   val = gr.reference.someField.getValue();
        * }
        * @param {GlideRecord} any_gr
        * @param {DotWalkFieldName[]} flattenedFields
        */
        function addReferencedFields(any_gr,flattenedFields) {
            
            /**
             * @param {DotWalkFieldName} fldPath 
             */
            function addRef(fldPath) {
                if (fldPath.indexOf('.') >= 0) {

                    self._logInfo('addExtraField {0} = {1} ',fldPath,self.ADD_EXTRA_FIELDS);
                    if (self.ADD_EXTRA_FIELDS) {
                        any_gr.addExtraField(fldPath);
                    }
                }
            }

            for(let fInfo of flattenedFields) {
                addRef(fInfo);
            }
        }
        /**
         * If there are any nestedSelect items then flatten them
         * eg. [ 
         *  'sys_id' , 
         *  { parent: [ 'sys_id', 'name' ] }

        * ] => [ 'sys_id' , 'parent.sys_id' , 'parent.name' ]
        * 
        * @param {SelectList} selectList 
        */
        function flattenSelectList(selectList) {

            function addCols(columns,prefix,cols) {
                for(let c of cols) {
                    if (typeof c === 'string' ) {
                        columns.push(prefix + c);
                    } else {
                        for(let prop in c) {
                            addCols(prefix+prop+'.',c[prop]);
                        }
                    }
                }
            }
            
            let columnsOut = [];

            if (typeof selectList === 'string' ) {

                addCols(columnsOut,'',[selectList]);

            } else {

                addCols(columnsOut,'',selectList);
            }

            self._logInfo('flattenedList {0}',JSON.stringify(columnsOut));

            return columnsOut;
        }

        function addOrderBy(any_gr) {

            function addOrder(orderProp,grOrdeByMethod) {

                let orderVal = queryDef[orderProp];

                if (orderVal) {
                    if (Array.isArray(orderVal)) {
                        for(let fname of orderVal) {

                            self._logInfo('{0} {1}',orderProp,fname);
                            any_gr[grOrdeByMethod](fname);
                        }
                    } else {
                        self._logInfo('{0} {1}',orderProp,orderVal);
                        any_gr[grOrdeByMethod](orderVal);

                    }
                }
            }
            addOrder('orderBy','orderBy');
            addOrder('orderByDesc','orderByDesc');
        }

        self._logInfo(JSON.stringify(queryDef));

        let any_gr = new GlideRecord(queryDef.from);

        if (!any_gr.isValid()) throw new Error('unknown table '+queryDef.from);

        applyQuery(any_gr,queryDef.where );


        let flattenedSelectFields = flattenSelectList(queryDef.select);

        addReferencedFields(any_gr,flattenedSelectFields);

        addOrderBy(any_gr);


        if (queryDef.limit) {
            self._logInfo('limit {0}',queryDef.limit);
            any_gr.setLimit(queryDef.limit);
        }

        let rows = [];

        function t()  {
            return new Date().getTime();
        }
        let times = {
            start : t()
        }
        
        let rowTemplate = buildRowTemplate(flattenedSelectFields);

        self.querySafe(any_gr);

        times.query = t() - times.start;

        while(any_gr.next()) {

            rows.push(buildRow(any_gr,rowTemplate));

        }
        times.fetch = t() - times.start - times.query;

        self._logInfo(' times {0}',JSON.stringify(times));

        return rows;
    },


    /**
     * Extract the field from the row
     * @param {RowResultFieldValues[]} rowsIn 
     * @param {string} dotWalkName eg 'parent', 'child' , ''
     * @param {string} fieldName 
     * @returns {string[]} list of field values
     */
    rowsExtractField: function(rowsIn, dotWalkName , fieldName ) {

        if (dotWalkName) {
            return rowsIn.map( function(r) { return r[dotWalkName][fieldName]; });
        } else {
            return rowsIn.map( function(r) { return r[fieldName]; });
        }
    },

    /**
     * Convert array to object
     * @param {string[]} array 
     * @returns {Object.<string,true>}
     */
    _arrayToMap: function(array) {
        
        function addItem(set,item) { set[''+item] = true; }

        return array.reduce(addItem,{});
    },

    /**
     * 
     * @param {RowResultFieldValues[]} rowsIn 
     * @param {string} dotWalkName eg 'parent', 'child' or ''
     * @param {sys_id[]} sysids 
     */
    _filterRowsBySysids: function(rowsIn,dotWalkName,sysids) {

        let set = this._arrayToMap(sysids);
        let rowsOut;

        if (dotWalkName) {
            rowsOut = rowsIn.filter( function(r) { return (r[dotWalkName].sys_id in set); } );
        } else {
            rowsOut = rowsIn.filter( function(r) { return (r.sys_id in set); } );
        }
        return rowsOut;
    },

    /**
     * Add array a2 onto a1
     * @param {Array} target 
     * @param {Array} source 
     */
    addArray: function(target,source) {
        Array.prototype.push.apply(target,source);
        return target;
    },

    /**
     * Run a query only if query is valid
     * @param {GlideRecord} any_gr 
     */
    querySafe: function(any_gr) {

        let eq = any_gr.getEncodedQuery();

        this._logInfo('Encoded query  {0}',eq);

        if (!any_gr.isValidEncodedQuery(eq)) {
            throw new Error('Invalid query '+eq+ ' for ' +any_gr.getTableName());
        }
        any_gr.query();
    },

    /**
     * 
     * @param {FieldNameToValuesObj} targetMap 
     * @param {FieldNameToValuesObj} sourceMap 
     * @returns {FieldNameToValuesObj} targetMap
     */
    _fieldMapMerge: function(targetMap,sourceMap) {
        return Object.assign(targetMap,sourceMap);
    },
    /**
     * Log info message
     */
    _logInfo: function() {
        this._log(gs.info,arguments);
    },
    /**
     * Log warn message
     */
    _logWarn: function() {
        this._log(gs.warn,arguments);
    },
    /**
     * Log warn message
     */
    _logError: function() {
        this._log(gs.error,arguments);
    },
    /**
     * Log a message with testId Prefix
     * @param {gs log function} logger 
     * @param {arguments} args 
     */
    _log: function(gsLogFn,args) {
        
        let a = [];
        a.push(...args);
        a[0] = 'QueryHelper:'+a[0];
        gsLogFn.apply(gs,a);
    },

    test: function() {

        let self = this;

        function t(q,autoAdd) {

            self._logInfo('test autoadd={0}',autoAdd);

            self.autoAddExtraFields(autoAdd);

            let rows = self.queryAll(q);

            for(let r of rows) {
                self._logInfo(JSON.stringify(r));
                self._logInfo(r.user.last_name);
            }
        }
        let q = {
            select : [ 'user.name', 'user.last_name', 'group.name' ],
            from : 'sys_user_grmember',
            where: [
                [ 'user.first_name' , 'Alex'  ]
            ]
        };

        t(q,true);
        t(q,false);

    },

    // This function acts as a 'difference' method for arrays.
    arrayDifference: function(arr1, arr2) {
        // Create a Set from the second array for fast lookups.
        const set2 = new Set(arr2);
  
        // Filter the first array, keeping only items NOT in the second Set.
        return arr1.filter(item => !set2.has(item));
    },

    /**
     * Clone an object using JSON - function properties, circular refs not supported!
     * @param {object} obj 
     * @returns {object} a copy
     */
    _clone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    type: 'ScriptUtils_QueryHelper'
}