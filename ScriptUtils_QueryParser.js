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
        let self = this;
        let exp;
        let expStack = [];
        let boolOpStack = [];
        
        function parseBrackets() {

            let token = self.getNextToken();

            let newEndTokens =  [ ...endTokens, this.TOKEN_TYPES.RPAR] 

            exp = self.parseExp(token , newEndTokens );

            expStack.push(exp);

            token = self.expect([this.TOKEN_TYPES.RPAR]);
        }

        function parseAnd() {
            let expList = [ parseSimple() ];

            if (self.peekToken()) {
            }

        }

        function parseOR() {

        }
        function parseSimple() {

            let field = self.expect( [self.TOKEN_TYPES.FIELD]);
            let op = self.expect( [self.TOKEN_TYPES.OP]);
            let val = self.expect( [self.TOKEN_TYPES.STRING,self.TOKEN_TYPES.NUMBER]);

            exp = {
                field: field,
                op: op,
                val: val
            }
            return exp;
        }

        let nextToken = this.getNextToken();

        if (startToken.type === self.TOKEN_TYPES.LPAR) {

            exp = parseBrackets();

        } else {

            exp = parseAND();

                }
            let token = self.expect([self.TOKEN_TYPES.AND, self.TOKEN_TYPES.OR,self.TOKEN_TYPES.EOF]);
            if (token.type === self.TOKEN_TYPES.EOF) {
                break;
            }

            


    },

    TOKEN_TYPES : {
        FIELD: { label:"FIELD", re: /^[a-z][a-z_0-9]*(\.[a-z][a-z_0-9]*|)\b/ },
        STRING: { label: "STRING",
        NUMBER: { label: "NUMBER",
        OP: { label: "QUERYOP",
        AND: { label: "AND",
        OR: { label: "OR",
        LPAR: { label: "(",
        RPAR: { label: ")",
        EOF: { label: "<EOF>"
    },
    skipSpace: function() {
        let p = this.stream.search(/\S/);
        if (p) {
            this.stream = this.stream.slice(p);
        }
    },
    getNextToken: function() {
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
                token = { type : this.TOKEN_TYPES.EOF , value: null };
            }
        }
        return token;
    },

    type: "ScriptUtils_QueryParser"
}