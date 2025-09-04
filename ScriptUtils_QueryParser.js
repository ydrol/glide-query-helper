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
        FIELD: {
            label:"FIELD",
            re: /^[a-z][a-z_0-9]*(\.[a-z][a-z_0-9]*|)\b/ },
        STRING: {
            label: "STRING",
            re: /^('[^']*'|"[^"]*")\b/ ,
        NUMBER: {
            label: "NUMBER",
            re: /^[+-]?[0-9]+(|\.[0-9]+)\b/ },
        OP: {
            label: "QUERYOP",
            re: /^(=|!=|>=|<=|IN)\b/ },
        AND: {
            label: "AND",
            re: /^AND\b/ },
       
        OR: {
            label: "OR",
            re: /^OR\b/ },
        LPAR: {
            label: "(",
            re: /^\(\b/ },
        RPAR: {
            label: ")",
            re: /^\)\b/ },
        EOF: {
            label: "<EOF>",
            re: /^$/ }
    },
    skipSpace: function() {
        let p = this.stream.search(/\S/);
        if (p) {
            this.stream = this.stream.slice(p);
        }
    },
    getNextToken: function() {

        this.skipSpace();

        for (t in this.TOKEN_TYPES) {

            let match = this.stream.match(this.TOKEN_TYPES[y].re);

            if (match) {
                this.stream = this.stream.slice(match[0].length);

                token = { type : t , value: match[0] };

                if (t === this.TOKEN_TYPES.STRING) {
                    // Remove quotes
                    token.value = token.value.slice(1,-1);
                }

                return token;
            }
        }
        throw new Error(`Unable to parse ${this.stream}`);
    },

    type: "ScriptUtils_QueryParser"
}