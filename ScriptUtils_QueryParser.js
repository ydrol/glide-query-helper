//ES6+

/*
var qp = new ScriptUtils_QueryParser();
qp.parseQueryExp('a = 1 AND b = 2 OR c = 3');

*** Script: Match <<a = 1 AND b = 2 OR c = 3>> with <<{"label":"FIELD","re":{}}>> = ["a",""]
*** Script: Match <<= 1 AND b = 2 OR c = 3>> with <<{"label":"QUERYOP","re":{}}>> = ["=","="]
*** Script: Match <<1 AND b = 2 OR c = 3>> with <<{"label":"NUMBER","re":{}}>> = ["1",""]
*** Script: Match <<AND b = 2 OR c = 3>> with <<{"label":"AND","re":{}}>> = ["AND"]
*** Script: Match <<b = 2 OR c = 3>> with <<{"label":"FIELD","re":{}}>> = ["b",""]
*** Script: Match <<= 2 OR c = 3>> with <<{"label":"QUERYOP","re":{}}>> = ["=","="]
*** Script: Match <<2 OR c = 3>> with <<{"label":"NUMBER","re":{}}>> = ["2",""]
*** Script: Match <<OR c = 3>> with <<{"label":"OR","re":{}}>> = ["OR"]
*** Script: Match <<c = 3>> with <<{"label":"FIELD","re":{}}>> = ["c",""]
*** Script: Match <<= 3>> with <<{"label":"QUERYOP","re":{}}>> = ["=","="]
*** Script: Match <<3>> with <<{"label":"NUMBER","re":{}}>> = ["3",""]
*** Script: Match <<>> with <<{"label":"_EOF_","re":{}}>> = [""]
*** Script:
    {
    "operator": { "type": { "label": "FIELD", "re": {} }, "value": "b" },
    "children": [
        {
            "field": { "type": { "label": "FIELD", "re": {} }, "value": "a" },
            "operator": { "type": { "label": "QUERYOP", "re": {} }, "value": "=" },
            "value": { "type": { "label": "NUMBER", "re": {} }, "value": "1" },
            "children": null
        },
        {
            "operator": { "type": { "label": "FIELD", "re": {} }, "value": "c" },
            "children": [
                {
                    "field": { "type": { "label": "FIELD", "re": {} }, "value": "b" },
                    "operator": { "type": { "label": "QUERYOP", "re": {} }, "value": "=" },
                    "value": { "type": { "label": "NUMBER", "re": {} }, "value": "2" },
                    "children": null
                },
                {
                    "field": { "type": { "label": "FIELD", "re": {} }, "value": "c" },
                    "operator": { "type": { "label": "QUERYOP", "re": {} }, "value": "=" },
                    "value": { "type": { "label": "NUMBER", "re": {} }, "value": "3" },
                    "children": null
                }
            ]
        }
    ]
}
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

        const exp =  this.parseAND();
        gs.info(JSON.stringify(exp,null,4));

    },
    /**
     * start with this.currentToken set
     * end with currentToken at the next token
     * @returns {Node}
     * 
     * TODO
     * 
     * 
     */
    parseAND: function() {
        return this.parseANDOR(this.TOKEN_TYPES.AND,this.parseOR);
    },
    parseOR: function() {
        return this.parseANDOR(this.TOKEN_TYPES.OR,this.parseSIMPLE);
    },

    parseANDOR: function(tokenType,nextParser) {
        
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

    type: "ScriptUtils_QueryParser"
}