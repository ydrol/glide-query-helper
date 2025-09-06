//ES6+

/*
    */

var ScriptUtils_QueryParser = Class.create();
ScriptUtils_QueryParser.prototype = /** @lends ScriptUtils_QueryParser.prototype */ {
    initialize: function() {
    },

    // regex to parse a token
    TOKEN_TYPES : {
        FIELD:  { label: "FIELD",   re: /^[a-z][a-z_0-9]*(\.[a-z][a-z_0-9]*|)\b/ },
        STRING: { label: "STRING",  re: /^('[^']*'|"[^"]*")/ } ,
        NUMBER: { label: "NUMBER",  re: /^[+-]?[0-9]+(|\.[0-9]+)/ },
        QUERYOP:{ label: "QUERYOP", re: /^(=|!=|>=|<=|<|>|IN\b)/ },
        AND:    { label: "AND",     re: /^AND\b/ },
        OR:     { label: "OR",      re: /^OR\b/ },
        LPAR:   { label: "_(_",     re: /^\(/ },
        RPAR:   { label: "_)_",     re: /^\)/ },
        EOL:    { label: "_EOL_",   re: /^$/ }
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

        this.getNextToken();

        let expTree =  this.parseAND();
        
        if (this.currentToken.type !== this.TOKEN_TYPES.EOL) {
            throw new Error(`Stopped at <<${this.stream}>>`);
        }
        expTree = this.insertRootAND(expTree);
        gs.info(this.nodeStr(expTree));

        gs.info(JSON.stringify(expTree,null,4));
        return expTree;

    },
    /**
     * start with this.currentToken set
     * end with currentToken at the next token
     * @returns {Node}
     * 
     */
    parseAND: function() {
        return this.parseANDOR(this.TOKEN_TYPES.AND,this.parseOR);
    },
    parseOR: function() {
        return this.parseANDOR(this.TOKEN_TYPES.OR,this.parseSIMPLE);
    },

    parseANDOR: function(tokenType,nextParser) {
        

        let expressions = [];

        let opToken;

        let subexp = nextParser.call(this);
        expressions.push(subexp);

        opToken = this.currentToken;

        while (this.currentToken.type === tokenType) {

            this.getNextToken();

            subexp = nextParser.call(this);
            expressions.push(subexp);
        }

        if (expressions.length === 1) {
            return expressions[0];
        } else {
            return this.newNodeBool(opToken , expressions );
        }
    },

    newNodeLeaf: function(fieldToken,opToken,valToken) {

        const node = {
            fieldToken: fieldToken,
            opToken : opToken,
            valToken: valToken,
            children: null
        }
        return node;
    },
    /**
     * 
     * @param {*} opToken  - AND or OR token
     * @param {*} childNodes - list of child nodes to be added
     * @param {boolean} allowSingleChild - for top level AND node (that maps to gr.addQuery() ) we want to allow a single child. 
     * @returns 
     */
    newNodeBool: function(opToken,childNodes,allowSingleChild) {

        // Add a child node - (if the child node is the same operator then merge it with parent)
        // (ie a AND b AND c ) = a AND ( b AND c) = 
        function addNode(node,child) {
            // If AND node has AND child move grandchildren up (flatten the tree)
            // (same with "OR")
            if (child.opToken.type === node.opToken.type) {
                // copy grand-children up and ignore the child
                gs.info('GRANDCHILD ADOPT ')
                node.childNodes.push(...child.childNodes);
            } else {
                // just add the child
                node.childNodes.push(child);
            }
        }

        const node = {
            opToken : opToken,
            fieldToken: null,
            valToken: null,
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
     * start with this.currentToken set
     * end with currentToken at the next token
     * @returns {Node}
     */
    parseSIMPLE: function () {

        let node;

        if (this.currentToken.type === this.TOKEN_TYPES.LPAR) {

            this.getNextToken();

            node = this.parseAND();

            this.expect([this.TOKEN_TYPES.RPAR]);

            this.getNextToken();

            return node;

        } else if (this.currentToken.type === this.TOKEN_TYPES.FIELD) {

            let fieldToken = this.currentToken;

            this.getNextToken();

            let opToken = this.expect( [this.TOKEN_TYPES.QUERYOP]);

            this.getNextToken();

            let valToken = this.expect( [
                this.TOKEN_TYPES.STRING
                ,this.TOKEN_TYPES.NUMBER
            ]);

            this.getNextToken();

            return this.newNodeLeaf(fieldToken,opToken,valToken);

        }
    },

    skipSpace: function() {
        let p = this.stream.search(/\S/);
        if (p) {
            this.stream = this.stream.slice(p);
        }
    },

    tokenTypeStr: function(tokenType) {
        return `<${tokenType.label}>`;
    },

    tokenStr: function(token) {
        return `${this.tokenTypeStr(token.type)}:"${token.value}"`;
    },

    nodeStr: function(node) {
        if (node.childNodes) {
            return `${this.tokenStr(node.opToken)}(${node.childNodes.map(this.nodeStr,this)})`;
        } else {
            return `${this.tokenStr(node.fieldToken)} ${this.tokenStr(node.opToken)} ${this.tokenStr(node.valToken)} `;
        }
    },

    expect: function(allowedTypes) {

        if (allowedTypes.includes(this.currentToken.type)) {
            return this.currentToken;
        }

        let types = allowedTypes.map(function(t) { return t.label;} );

        throw new Error(
            `unexpected token ${this.tokenStr(this.currentToken)}: expected : ${types}`);
    },

    getNextToken: function() {

        this.skipSpace();

        for (typeName in this.TOKEN_TYPES) {

            let typeObj = this.TOKEN_TYPES[typeName];

            let match = this.stream.match(typeObj.re);


            if (match !== null) {
                gs.info(`Match <<${this.stream}>> with <<${JSON.stringify(typeObj)}>> = ${JSON.stringify(match)}`);
                this.stream = this.stream.slice(match[0].length);

                token = this.newToken(typeObj , match[0] );

                if (typeObj === this.TOKEN_TYPES.STRING) {
                    // Remove quotes
                    token.value = token.value.slice(1,-1);
                }

                this.currentToken = token;
                return token;
            }
        }
        throw new Error(`Unable to parse <<${this.stream}>>`);
    },

    newToken: function(typeObj,value) {
        return { type: typeObj , value: value };
    },

    newTokenAND: function() {
        return this.newToken(this.TOKEN_TYPES.AND, "*AND*");
    },

    newTokenOR: function() {
        return this.newToken(this.TOKEN_TYPES.OR, "*OR*");
    },

    newTokenSTRING: function(v) {
        return this.newToken(this.TOKEN_TYPES.STRING, v);
    },

    newTokenField: function(fieldPath) {
        return this.newToken(this.TOKEN_TYPES.FIELD, fieldPath);
    },

    newTokenIN: function() {
        return this.newToken(this.TOKEN_TYPES.QUERYOP, "IN");
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

        if (expTree.opToken.type !== this.TOKEN_TYPES.AND ) {

            gs.info('ADDING');
            //// Add the child explicitly otherwise the code will reduce an AND node with only one child to be just the child.
            newTree = this.newNodeBool(this.newTokenAND(),[expTree],true);
            gs.info(this.nodeStr(newTree));
        }
        return newTree;

    },

    hasComma: function(list) {
        return list.some((e) => e.includes(','));
    },

    replaceOrIN: function(expTree) {

        let self = this;

        function findMultipleORSameField(nodes) {
            let fieldsToValues = {};

            let eqNodes = self.filterNodesByQueryOp(nodes,'=');

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

        function buildNewList(nodes,fieldsToValues) {
            let nodes = [];
            for (let n of nodes) {
                if (n.opToken.type !== this.TOKEN_TYPES.QUERYOP ||
                    n.opTokenValue !== '=' ) {
                        nodes.push(n);
                } else if ( ! ( n.fieldToken in fieldsToValues )) {
                        nodes.push(n);
                } 
            }
            for (f in fieldsToValues) {

                let n = self.newNodeLeaf(
                    self.newTokenField(f),
                    self.newTokenIN(),
                    self.newTokenSTRING(fieldsToValues.join()));

                nodes.push(n);
            }
            return nodes;
        }

        // Do subtree first.
        if (expTree.childNodes) {
            for(let n of expTree.childNodes) {
                this.replaceOrIN(n);
            }
        }

        if (expTree.opToken.type === this.TOKEN_TYPES.OR) {

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

    filterNodesByQueryOp: function(nodes, opTokenValue ) {

        return this.filterNodesByOpType(
            nodes,this.TOKEN_TYPES.QUERYOP,opTokenValue);

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
    },
    /**
     * Filter a list of nodes by opType
     * @param {Node[]} nodes - list of nodes
     * @param {*} opTokenType - tokenType to filter node.opToken
     * @param {*} [opTokenValue] - token value  
     * @returns {Node[]} list of filtered nodes
     */
    filterNodesByOpType: function(nodes, opTokenType, opTokenValue  ) {

        if (opTokenValue === undefined) {
            return  nodes.filter(
                (node) =>
                    node.opToken.type === opTokenType );
        } else {
            return  nodes.filter(
                (node) =>
                    node.opToken.type === opTokenType && 
                    node.opToken.value === opTokenValue
            );

        }
    },

    /**
     * Filter a list of nodes by fieldPath
     * @param {Node[]} nodes - list of nodes
     * @param {*} opTokenType - tokenType to filter node.opToken
     * @param {*} [opTokenValue] - token value  
     * @returns {Node[]} list of filtered nodes
     */
    filterNodesByFieldPath: function(nodes, fieldPath  ) {

        return nodes.filter( 
            (node) => 
                node.fieldToken.type === this.TOKEN_TYPES.FIELD &&
                node.fieldToken.value === fieldPath  );
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
            (node) => node.fieldToken != null ).map(
            (node) => node.fieldToken.value );

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
            (node) => node.valToken != null ).map(
            (node) => node.valToken.value );

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


    // F = 1 or F = 2 or f = 3   => f in 1,2,3

    type: "ScriptUtils_QueryParser"
}