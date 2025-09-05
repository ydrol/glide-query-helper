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
        OP:     { label: "QUERYOP", re: /^(=|!=|>=|<=|IN\b)/ },
        AND:    { label: "AND",     re: /^AND\b/ },
        OR:     { label: "OR",      re: /^OR\b/ },
        LPAR:   { label: "_(_",     re: /^\(/ },
        RPAR:   { label: "_)_",     re: /^\)/ },
        EOF:    { label: "_EOF_",   re: /^$/ }
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

        const expTree =  this.parseAND();
        gs.info(JSON.stringify(expTree,null,4));

        this.insertConditionNoops(expTree);
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
        
        // Add a child node - (if the child node is the same operator then merge it with parent)
        // (ie a AND b AND c ) = a AND ( b AND c) = 
        function addNode(node,child) {
            // If AND node has AND child move grandchildren up (flatten the tree)
            // (same with "OR")
            if (child.operator === node.operator) {
                // copy grand-children up
                node.children.push(...child.children);
            } else {
                // just add the child
                node.children.push(child);
            }
        }

        let node = {
            operator: null,
            children: []
        };

        let subexp = nextParser.call(this);
        addNode(node,subexp);

        while (this.currentToken.type === tokenType) {

            this.getNextToken();

            node.operator = tokenType;

            subexp = nextParser.call(this);
            addNode(node,subexp);
        }

        if (node.children.length === 1) {
            return node.children[0];
        } else {

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

        } else if (this.currentToken.type === this.TOKEN_TYPES.FIELD) {

            node = {
                field: this.currentToken,
                operator : null,
                value: null,
                children: null
            };

            this.getNextToken();

            node.operator = this.expect( [this.TOKEN_TYPES.OP]);

            this.getNextToken();

            node.value = this.expect( [
                this.TOKEN_TYPES.STRING
                ,this.TOKEN_TYPES.NUMBER
            ]);

        }
        this.getNextToken();
        return node;
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
        return `${this.tokenTypeStr(token.type)}:<${token.value}>`;
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

                token = { type : typeObj , value: match[0] };

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
    insertConditionNoops: function(expTree) {

    },

    type: "ScriptUtils_QueryParser"
}