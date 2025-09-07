//ES6+

/*
    
nullOps

var gr = new GlideRecord('task');
gr.addQuery('active','NSAMEAS','active');

gs.trace(1);
gr.query();
gs.trace(0);


SELECT sys_script0.`sys_id` 
FROM (sys_script sys_script0  
INNER JOIN sys_metadata sys_metadata0 ON sys_script0.`sys_id` = sys_metadata0.`sys_id` )  
WHERE 
sys_script0.`collection` IN ('task') 
AND sys_script0.`action_query` = 1 
AND sys_script0.`active` = 1 
AND sys_script0.`when` = 'before' 
ORDER BY sys_script0.`order`,sys_script0.`name`,sys_script0.`sys_id` /* dev307502002, gs:9D56004A47FBA2101DE6BB30116D43B0, tx:4b53d8ce47fba2101de6bb30116d433a, hash:-75263405 


=====================================
gr.addQuery('sys_id','ANYTHING',null);
AND 1 = 1 
gr.addQuery('sys_id','NOTANYTHING',null);
WHERE 0 = 1 

BUT ServiceNow might discards any  addConditionaddOrCondtion added to the ANYTHING!

Eg.
var gr = new GlideRecord('task');

var c = gr.addQuery('sys_id','NOTANYTHING',null);

var e2 = c.addOrCondition('short_description','=','E2');
gs.info(gr.getEncodedQuery());


gs.trace(1);

gr.query();
v=gr.getRowCount();
gs.trace(0);
gs.info(v);
-------------------------
SELECT task0.`sys_id` FROM task task0  WHERE 0 = 1
----------------------------

So better to use SAMEAS / NSAMEAS
var c = gr.addQuery('sys_id','NSAMEAS','sys_id');
var e2 = c.addOrCondition('short_description','=','E2');
-----
WHERE (task0.`sys_id` != task0.`sys_id` OR task0.`short_description` = 'E2') 
-----



gr.addQuery('sys_mod_count','BETWEEN','2@1');
AND (task0.`sys_mod_count` >= 2 AND task0.`sys_mod_count` <= 1)

gr.addQuery('sys_id','');
WHERE task0.`sys_id` = '' 


gr.addQuery('sys_id','SAMEAS','sys_id');
WHERE task0.`sys_id` = task0.`sys_id` 

gr.addQuery('sys_id','NSAMEAS','sys_id');
WHERE task0.`sys_id` != task0.`sys_id` 

    */

var ScriptUtils_QueryParser = Class.create();
ScriptUtils_QueryParser.prototype = /** @lends ScriptUtils_QueryParser.prototype */ {
    initialize: function() {
        // regex to parse a token
        const tt = this.TOKEN_TYPES = {
            FIELD:  { txt:'F:' },
            STRING: { txt:'$:'} ,
            NUMBER: { txt:'#:'},
            QUERYOP:{ txt:'op:'},
            BOOLOP: { txt:'&|:'},
            PAR:   { txt:'():'},
            EOL:    { txt:'.'}
        };

        this.TOKENS = {
            FIELD:  { type: tt.FIELD,   txt:'F:', re: /^[a-z][a-z_0-9]*(\.[a-z][a-z_0-9]*|)\b/ },
            STRING: { type: tt.STRING,  txt:'$:', re: /^('[^']*'|"[^"]*")/ } ,
            NUMBER: { type: tt.NUMBER,  txt:'#:', re: /^[+-]?[0-9]+(|\.[0-9]+)/ },
            EQ:     { type: tt.QUERYOP, txt:'?:', re: /^(=|SAMEAS\b)/ },
            NE:     { type: tt.QUERYOP, txt:'?:', re: /^(!=|<>|NSAMEAS\b)/ },
            LT:     { type: tt.QUERYOP, txt:'<:', re: /^(<(?![>=])|LT_FIELD\b)/ },
            GT:     { type: tt.QUERYOP, txt:'>:', re: /^(>(?!=)|GT_FIELD\b)/ },
            LE:     { type: tt.QUERYOP, txt:'<=:', re: /^(<=|LT_OR_EQUALS_FIELD\b)/ },
            GE:     { type: tt.QUERYOP, txt:'>=:', re: /^(>=|GT_OR_EQUALS_FIELD\b)/ },
            LIKE:   { type: tt.QUERYOP, txt:'LIKE:', re: /^LIKE\b/ },
            BETWEEN:{ type: tt.QUERYOP, txt:'BETWEEN:', re: /^BETWEEN\b/ },
            IN:     { type: tt.QUERYOP, txt:'IN:', re: /^IN\b/ },
            NOTIN:  { type: tt.QUERYOP, txt:'!IN:', re: /^NOT IN\b/ },
            AND:    { type: tt.QUERYOP, txt:'&:', re: /^AND\b/ },
            OR:     { type: tt.QUERYOP, txt:'|:', re: /^OR\b/ },
            LPAR:   { type: tt.PAR, txt:'():', re: /^\(/ },
            RPAR:   { type: tt.PAR, txt:'):',  re: /^\)/ },
            EOL:    { type: tt.EOL, txt:'.',   re: /^$/ }

    /*
    =	ANYTHING	GT_FIELD	NOT IN
    !=	BETWEEN	GT_OR_EQUALS_FIELD	NOT LIKE
    >	CONTAINS	IN	NSAMEAS
    >=	DOES NOT CONTAIN	INSTANCEOF	ON
    <	DYNAMIC	LIKE	SAMEAS
    <=	EMPTYSTRING	LT_FIELD	STARTSWITH
    ENDSWITH	LT_OR_EQUALS_FIELD	
    */

        };
    },

    /*

    select (datediff (field) + 1 => DBFunction

    var expr = new GlideDBFunctionBuilder() 
    .andFunc() 
        .compare().field('first_name').constant('=').constant('John').endfunc() 
        .compare().field('active').constant('=').constant(1).endfunc() 
    .endfunc() 
    .build(); 


    gs.info("Expression: " + expr);

    field = 
    addQuery('field','op','value')


select * , extra.field , 
NUMBER
STRING
FIELDNAME
FUNCTION

( FIELD OP VALUE  )


new ScriptUtils_QueryParser().parseQueryExp('a = 1 AND b = 2');


    */
    parseQueryExp: function(queryExpression) {

        this.stream = queryExpression;
        this.streamPos = 0;

/*
    // In ServiceNow(unlike SQL) AND has lower precedence to OR
    // so OR is *completed* first (via recursion)

        ANDExpression => ORExpression ( AND ORExpression )
        ORExpression  => SIMPLE ( OR SIMPLE )
        SIMPLE => FIELD-OP-VALUE | ( AndExpression )

*/

        this.getNextTokenValue();

        let expTree =  this.parseAND();
        
        if (this.currentTokenValue.token !== this.TOKENS.EOL) {
            throw new Error(`Stopped at <<${this.stream}>>`);
        }
        expTree = this.insertRootAND(expTree);
        this._logInfo(this.nodeStr(expTree));

        //this._logInfo(JSON.stringify(expTree,null,4));
        return expTree;

    },
    /**
     * start with this.currentTokenValue set
     * end with currentTokenValue at the next token
     * @returns {Node}
     * 
     */
    parseAND: function() {
        return this.parseANDOR(this.TOKENS.AND,this.parseOR);
    },
    parseOR: function() {
        return this.parseANDOR(this.TOKENS.OR,this.parseSIMPLE);
    },

    parseANDOR: function(tokenType,nextParser) {
        

        let expressions = [];

        let opValue;

        let subexp = nextParser.call(this);
        expressions.push(subexp);

        opValue = this.currentTokenValue;

        while (this.currentTokenValue.token === tokenType) {

            this.getNextTokenValue();

            subexp = nextParser.call(this);
            expressions.push(subexp);
        }

        if (expressions.length === 1) {
            return expressions[0];
        } else {
            return this.newNodeBool(opValue , expressions );
        }
    },

    newNodeLeaf: function(fieldValue,opValue,valTokens) {

        const node = {
            fieldValue: fieldValue,
            opValue : opValue,
            valTokens: valTokens,
            childNodes: null
        }
        return node;
    },
    /**
     * 
     * @param {*} opValue  - AND or OR token
     * @param {*} childNodes - list of child nodes to be added
     * @param {boolean} allowSingleChild - for top level AND node (that maps to gr.addQuery() ) we want to allow a single child. 
     * @returns 
     */
    newNodeBool: function(opValue,childNodes,allowSingleChild) {

        // Add a child node - (if the child node is the same operator then merge it with parent)
        // (ie a AND b AND c ) = a AND ( b AND c) = 
        function addNode(node,child) {
            // If AND node has AND child move grandchildren up (flatten the tree)
            // (same with "OR")
            if (child.opValue.token === node.opValue.token) {
                // copy grand-children up and ignore the child
                //this._logInfo('GRANDCHILD ADOPT ')
                node.childNodes.push(...child.childNodes);
            } else {
                // just add the child
                node.childNodes.push(child);
            }
        }

        const node = {
            opValue : opValue,
            fieldValue: null,
            valTokens: null,
            childNodes: []
        }
        if (!allowSingleChild && childNodes.length === 1) {
            return childNodes[0];
        } else {
            for(let child of childNodes) {
                addNode(node,child);
            }
            return node;
        }
    },

    /**
     * start with this.currentTokenValue set
     * end with currentTokenValue at the next token
     * @returns {Node}
     */
    parseSIMPLE: function () {

        let node;

        if (this.currentTokenValue.token === this.TOKENS.LPAR) {

            this.getNextTokenValue();

            node = this.parseAND();

            this.expectToken([this.TOKENS.RPAR]);

            this.getNextTokenValue();

            return node;

        } else if (this.currentTokenValue.token === this.TOKENS.FIELD) {

            let fieldValue = this.currentTokenValue;

            this.getNextTokenValue();

            let opValue = this.expectTokenType( [this.TOKEN_TYPES.QUERYOP  ]);

            this.getNextTokenValue();

            let valTokens = [];

            let valTokenValue = this.expectToken( [
                this.TOKENS.STRING 
                ,this.TOKENS.NUMBER 
                , this.TOKENS.FIELD ]) ;

            valTokens.push(valTokenValue);

            this.getNextTokenValue();

            if (opValue.token === this.TOKENS.BETWEEN ) {
                // TODO 
                this.expectToken( [ this.TOKENS.AND ] );

                let num2 = this.getNextTokenValue();

                this.expectToken( [ this.TOKENS.STRING , this.TOKENS.NUMBER ] );

                valTokens.push(num2);

                this.getNextTokenValue();
            }

            return this.newNodeLeaf(fieldValue,opValue,valTokens);

        }
    },


    skipSpace: function() {
        let p = this.stream.search(/\S/);
        if (p) {
            this.stream = this.stream.slice(p);
        }
    },

    tokenTypeStr: function(tokenType) {
        return `${tokenType.txt}`;
    },

    tokenStr: function(token) {
        return `${this.tokenTypeStr(token.token)}${token.value}`;
    },

    nodeStr: function(node) {
        if (node.childNodes) {
            return `${this.tokenStr(node.opValue)}( ${node.childNodes.map(this.nodeStr,this).join(' , ')} )`;
        } else {
            return `${this.tokenStr(node.fieldValue)} ${this.tokenStr(node.opValue)} ${node.valTokens.map(this.tokenStr,this).join('@')}`;
        }
    },
    expectToken: function(allowedTokens) {

        if (allowedTokens.includes(this.currentTokenValue.token)) {
            return this.currentTokenValue;
        }

        const tokens = allowedTokens.map(function(t) { return t.txt;} );

        throw new Error(
            `unexpected token ${this.tokenStr(this.currentTokenValue)}: expected token : ${tokens}`);
    },
    expectTokenType: function(allowedTypes) {

        if (allowedTypes.includes(this.currentTokenValue.token.type)) {
            return this.currentTokenValue;
        }

        const types = allowedTypes.map(function(t) { return t.txt;} );

        throw new Error(
            `unexpected token type ${this.tokenStr(this.currentTokenValue)}: expected token type : ${types}`);
    },

    getNextTokenValue: function() {

        this.skipSpace();

        for (const tokenName in this.TOKENS) {

            let tokenObj = this.TOKENS[tokenName];

            let match = this.stream.match(tokenObj.re);

            if (match !== null) {
                //this._logInfo(`Match <<${this.stream}>> with <<${JSON.stringify(tokenObj)}>> = ${JSON.stringify(match[0])}`);
                this.stream = this.stream.slice(match[0].length);

                const tokenValue = this.newTokenValue(tokenObj , match[0] );

                if (tokenObj === this.TOKENS.STRING) {
                    // Remove quotes
                    tokenValue.value = tokenValue.value.slice(1,-1);
                }

                this.currentTokenValue = tokenValue;
                return tokenValue;
            }
        }
        throw new Error(`Unable to parse <<${this.stream}>>`);
    },

    newTokenValue: function(tokenObj,value) {
        return { token: tokenObj , value: value };
    },

    newTokenAND: function() {
        return this.newTokenValue(this.TOKENS.AND, "*AND*");
    },

    newTokenOR: function() {
        return this.newTokenValue(this.TOKENS.OR, "*OR*");
    },

    newTokenSTRING: function(v) {
        return this.newTokenValue(this.TOKENS.STRING, v);
    },

    newTokenField: function(fieldPath) {
        return this.newTokenValue(this.TOKENS.FIELD, fieldPath);
    },

    newTokenIN: function() {
        return this.newTokenValue(this.TOKENS.QUERYOP, "IN");
    },

    /**
     * Glide AND/OR operations have the following limitations:
     * 1.  can one add simple clauses at a time. 
     * 2. Top level operation is AND.
     * 
     * As a result any subtree that does not have a "simple" node cannot be directly 
     * represented without modification.
     * 
     * 
     * eg.  (A AND B) OR (C AND D)
     * 
     * The solution is to introduce fake "simple nodes" we can use to anchor other nodes
     * to but that do not change the result of the calculation and are optimized away by MariaDB query optimizer.
     *  use redundant OP similar to 1=1 in SQL. and hope that
     *  the database Squery optimizer removes/ignores them.
     * 
     * 
     * @param {*} expTree 
     */
    insertRootAND: function(expTree) {

        let newTree = expTree;

        if (expTree.opValue.token === this.TOKENS.OR ) {

            if (!this.hasSimpleChild(expTree)) {


                this._logInfo('ADDING');
                //// Add the child explicitly otherwise the code will reduce an AND node with only one child to be just the child.
                newTree = this.newNodeBool(this.newTokenAND(),[expTree],true);
                //this._logInfo(this.nodeStr(newTree));
            }
        }
        return newTree;

    },

    filterSimpleChildren: function(nodes) {
        if (nodes) {
            return this.filterNodesByOpTokenType(nodes,this.TOKEN_TYPES.QUERYOP);
        }
    },

    hasSimpleChild: function(tree) {
        const simple = this.filterSimpleNodes(tree.childNodes);
        if (simple) {
            return simple.length > 0;
        } else {
            return false;
        }
    },

    hasComma: function(list) {
        return list.some((e) => e.includes(','));
    },

    replaceOrIN: function(expTree) {

        let self = this;

        function findMultipleORSameField(nodes) {
            let fieldsToValues = {};

            let eqNodes = self.filterNodesByOpToken(nodes,this.TOKENS.EQ);

            let eqFields = self.extractUniqueNodeFieldPaths(eqNodes);

            if (eqNodes.length !== eqFields.length) {
                // Some Field occures more than once
                for(fieldPath of eqFields) {
                    let nodesByField = self.filterNodesByFieldPath(eqNodes,fieldPath);
                    if (nodesByField.length > 1) {
                        let values = self.extractUniqueNodeValues(nodesByField);
                        if (!self.hasComma(values)) {
                            // IN only works if there is no comma in the values
                            fieldsToValues[fieldPath] =  self.extractUniqueNodeValues(nodesByField);
                        }
                        
                    }
                }
            }
            return fieldsToValues;
        }

        function buildNewList(oldNodes,fieldsToValues) {
            let newNodes = [];

            // Add nodes that are not equality nodes
            for (let n of oldNodes) {

                if (n.opValue.token !== this.TOKENS.QUERYOP ||
                    n.opValueValue !== '=' ) {
                        newNodes.push(n);
                } else if ( ! ( n.fieldValue in fieldsToValues )) {
                        newNodes.push(n);
                } 
            }
            for (f in fieldsToValues) {

                let n = self.newNodeLeaf(
                    self.newTokenField(f),
                    self.newTokenIN(),
                    self.newTokenSTRING(fieldsToValues.join()));

                newNodes.push(n);
            }
            return nodes;
        }

        // Do subtree first.
        if (expTree.childNodes) {
            for(let n of expTree.childNodes) {
                this.replaceOrIN(n);
            }
        }

        if (expTree.opValue.token === this.TOKENS.OR) {

            let fieldsToValues = findMultipleORSameField(expTree.childNodes);

            var newChildList = buildNewList(expTree.childNodes,fieldsToValues);

            self._assert(newChildList.length,'No children?');

            expTree.childNodes = newChildList;
        
            if (expTree.childNodes.length  == 1) {
                self.copyNodeOver(expTree,expTree.childNodes[0]);
            }
        }
    },

    copyNodeOver: function(target,source) {

        function clearObject(obj) {

            for (let p in obj) {
                if (Object.hasOwnProperty.call(obj,p)) {
                    delete obj[p];
                }
            }
        }

        clearObject(target);
        Object.assign(target,source);
    },

        /*
        TEST CODE:
        var exp = "a = 1 AND b = 2 AND a > 3";
        var qp = new ScriptUtils_QueryParser();
        var tree = qp.parseQueryExp(exp);
        var n = qp.filterNodesByQueryOp(tree.childNodes,'>');
        gs.info(JSON.stringify(n));
        -----
        >> [  a > 3]
        */
    /**
     * Filter a list of nodes by opType
     * @param {Node[]} nodes - list of nodes
     * @param {Token} token - tokenType to filter node.opValue
     * @returns {Node[]} list of filtered nodes
     */
    filterNodesByOpToken: function(nodes, token ) {

            return  nodes.filter(
                (node) =>
                    node.opValue.token === token );
    },    /**
     * Filter a list of nodes by opType
     * @param {Node[]} nodes - list of nodes
     * @param {TokenType} tokenType - tokenType to filter node.opValue
     * @returns {Node[]} list of filtered nodes
     */
    filterNodesByOpTokenType: function(nodes, tokenType ) {

            return  nodes.filter(
                (node) =>
                    node.opValue.token.type === tokenType );
    },

    /**
     * Filter a list of nodes by fieldPath
     * @param {Node[]} nodes - list of nodes
     * @param {*} opValueType - tokenType to filter node.opValue
     * @param {*} [opValueValue] - token value  
     * @returns {Node[]} list of filtered nodes
     */
    filterNodesByFieldPath: function(nodes, fieldPath  ) {

        return nodes.filter( 
            (node) => 
                node.fieldValue.token === this.TOKENS.FIELD &&
                node.fieldValue.value === fieldPath  );
        /*
        TEST CODE:
        var exp = "a = 1 AND b = 2 AND a = 3";
        var qp = new ScriptUtils_QueryParser();
        var tree = qp.parseQueryExp(exp);
        var n = qp.filterNodesByFieldPath(tree.childNodes,'a');
        gs.info(JSON.stringify(n,null,2));
        -----
        >> [  a=1  , a=3]
        */
    },

    /**
     * Extract list of values from list of nodes
     * @param {Nodes[]} nodes 
     * @returns {object[]} list of value objects.
     */
    extractUniqueNodeFieldPaths: function(nodes) {
        let v = nodes.filter(
            (node) => node.fieldValue != null ).map(
            (node) => node.fieldValue.value );

        return this.unique(v);
        /*
        TEST CODE:
        var exp = "a = 1 AND b = 2 AND c = 3 AND d = 2";
        var qp = new ScriptUtils_QueryParser();
        var tree = qp.parseQueryExp(exp);
        var v = qp.extractNodeFieldPaths(tree.childNodes);
        gs.info(JSON.stringify(v));
        -----
        >> [a,b,c,d]
        */
    },
    /**
     * Extract list of values from list of nodes
     * @param {Nodes[]} nodes 
     * @returns {object[]} list of value objects.
     */
    extractUniqueNodeValues: function(nodes) {

        let v = nodes.filter(
            (node) => node.valTokens != null ).map(
            (node) => node.valTokens[0].value );

        return this.unique(v);
        /*
        TEST CODE:
        var exp = "a = 1 AND b = 2 AND c = 3 AND d = 2";
        var qp = new ScriptUtils_QueryParser();
        var tree = qp.parseQueryExp(exp);
        var v = qp.extractNodeValues(tree.childNodes);
        gs.info(JSON.stringify(v));
        -----
        >> [1,2,3]
        */
    },

    unique: function(list) {
        return [...new Set(list)];
    },

    _assert: function(x,msg,...rest) {
        if (!x) {
            throw new Error(msg,...rest);
        }
    },

    /**
     * Log info message
     * @param {any[]} args  - first arg may contain  {0} ..{5} as plaeholders for args
     */
    _logInfo: function( ...args) {
        this._log(gs.info,...args);
    },
    /**
     * Log warn message
     * @param {any[]} args  - first arg may contain  {0} ..{5} as plaeholders for args
     */
    _logWarn: function( ...args) {
        this._log(gs.warn,...args);
    },
    /**
     * Log warn message
     * @param {any[]} args  - first arg may contain  {0} ..{5} as plaeholders for args
     */
    _logError: function( ...args) {
        this._log(gs.error,...args);
    },
    /**
     * Log a message
     * @param {gs log function} logger 
     * @param {any[]} args  - first arg may contain  {0} ..{5} as plaeholders for args
     */
    _log: function(gsLogFn,...args) {
        
        args[0] = `${this.type}:${args[0]}`;

        gsLogFn.call(gs,...args);

    },

	unittests: function() {

		let testgroups = {

            _unit_parseQueryExp : {
                test_simple: {
                    compute: function() {
                        let tree = this.parseQueryExp('a = 1');
                        return this.nodeStr(tree);
                    },
                    expect: "F:a ?:= #:1"
                },
                test_simpleand: {
                    compute: function() {
                        let tree = this.parseQueryExp('a = 1 AND b = 2');
                        return this.nodeStr(tree);
                    },
                    expect: "&:AND( F:a ?:= #:1 , F:b ?:= #:2 )"
                }, 
                test_andor: {
                    compute: function() {
                        let tree = this.parseQueryExp('a = 1 AND b = 2 OR c = 3');
                        return this.nodeStr(tree);
                    },
                    expect: "&:AND( F:a ?:= #:1 , |:OR( F:b ?:= #:2 , F:c ?:= #:3 ) )"
                },
                test_orand: {
                    compute: function() {
                        let tree = this.parseQueryExp('a = 1 OR b = 2 AND c = 3');
                        return this.nodeStr(tree);
                    },
                    expect: "&:AND( |:OR( F:a ?:= #:1 , F:b ?:= #:2 ) , F:c ?:= #:3 )"
                },
                test_simpleor: {
                    compute: function() {
                        let tree = this.parseQueryExp('sys_id = sys_id');
                        return this.nodeStr(tree);
                    },
                    expect: "&:*AND*( |:OR( F:a ?:= #:1 , F:b ?:= #:2 ) )"
                }, 
                test_simpleor: {
                    compute: function() {
                        let tree = this.parseQueryExp('a = 1 OR b = 2');
                        return this.nodeStr(tree);
                    },
                    expect: "|:OR( F:a ?:= #:1 , F:b ?:= #:2 )" // TODO
                    //expect: "&:*AND*( |:OR( F:a ?:= #:1 , F:b ?:= #:2 ) )"
                },
                test_topleveland: {
                    compute: function() {
                        let tree = this.parseQueryExp('(a = 1 AND b = 2 ) OR ( c = 3 AND d = 4)');
                        return this.nodeStr(tree);
                    },
                    expect: "&:*AND*( |:OR( &:AND( F:a ?:= #:1 , F:b ?:= #:2 ) , &:AND( F:c ?:= #:3 , F:d ?:= #:4 ) ) )"
                }, 
            }
		}

		new ScriptUtils_UnitTest().unittest(this,testgroups);

	},


    // F = 1 or F = 2 or f = 3   => f in 1,2,3

    type: "ScriptUtils_QueryParser"
}