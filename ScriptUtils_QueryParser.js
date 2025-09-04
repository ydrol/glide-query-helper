//ES6+

var ScriptUtils_QueryParser = Class.create();
ScriptUtils_QueryParser.prototype = /** @lends ScriptUtils_QueryParser.prototype */ {
    initialize: function() {
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
    parseQueryExp: function(queryExpression,start,end) {

        this.stream = queryExpression;
        this.streamPos = 0;


        return this.parseExp( new Set([ this.TOKEN_TYPES.EOF ]));


    },

    parseExp: function( endTokens ) {
        let startToken = this.nextToken();
        let exp;
        let expStack = [];
        let boolOpStack = [];
        while (true) {
            if (startToken.type === this.TOKEN_TYPES.LPAR) {

                let token = this.nextToken();

                let newEndTokens =  [ ...endTokens, this.TOKEN_TYPES.RPAR] 

                exp = this.parseExp(token , newEndTokens );

                expStack.push(exp);

                token = this.expect([this.TOKEN_TYPES.RPAR]);

            } else {

                let field = this.expect( [this.TOKEN_TYPES.FIELD]);
                let op = this.expect( [this.TOKEN_TYPES.OP]);
                let val = this.expect( [this.TOKEN_TYPES.STRING,this.TOKEN_TYPES.NUMBER]);

                exp = {
                    field: field,
                    op: op,
                    val: val
                }
            }
            let token = this.expect([this.TOKEN_TYPES.AND, this.TOKEN_TYPES.OR,this.TOKEN_TYPES.EOF]);
            if (token.type === this.TOKEN_TYPES.EOF) {
                break;
            }

            


        }
    },

    precedence: function(token) {
        if (token.type === this.TOKEN_TYPES)

    },

    TOKEN_TYPES : {
        FIELD: "FIELD",
        STRING: "STRING",
        NUMBER: "NUMBER",
        OP: "QUERYOP",
        AND: "AND",
        OR: "OR",
        LPAR: "(",
        RPAR: ")",
        EOF: "<EOF>"
    },
    skipSpace: function() {
        let p = this.stream.search(/\S/);
        if (p) {
            this.stream = this.stream.slice(p);
        }
    },
    nextToken: function() {
        this.skipSpace();
        let match = this.stream.match(/^'[^']*'\b/);
        if (match) {
            this.stream = this.stream.slice(match[0].length);
            token = { type : this.TOKEN_TYPES.STRING , value: match[0].slice(1,-1) };
        }
        if (!match) {
            match = this.stream.match(/^"[^"]*"\b/);
            if (match) {
                this.stream = this.stream.slice(match[0].length);
                token = { type : this.TOKEN_TYPES.STRING , value: match[0].slice(1,-1) };
            }
        }
        if (!match) {
            match = this.stream.match(/^[+-]?[0-9]+(|\.[0-9]+)\b/);
            if (match) {
                this.stream = this.stream.slice(match[0].length);
                token = { type : this.TOKEN_TYPES.NUMBER , value: match[0] };
            }
        }
        if (!match) {
            match = this.stream.match(/^[a-z][a-z_0-9]*(\.[a-z][a-z_0-9]*|)\b/);
            if (match) {
                this.stream = this.stream.slice(match[0].length);
                token = { type : this.TOKEN_TYPES.FIELD , value: match[0] };
            }
        }
        if (!match) {
            match = this.stream.match(/^(AND|OR)\b/);
            if (match) {
                this.stream = this.stream.slice(match[0].length);
                token = { type : this.TOKEN_TYPES.OP , value: match[0] };
            }
        }
        if (!match) {
            match = this.stream.match(/^$/);
            if (match) {
                this.stream = this.stream.slice(match[0].length);
                token = { type : this.TOKEN_TYPES.EOF , value: null
            }
        }
        return token;
    },

    type: "ScriptUtils_QueryParser"
}