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

        let stream = queryExpression;
        let streamPos = 0;

        function skipSpace() {
            let p = stream.search(/\S/);
            if (p) {
                stream = stream.slice(p);
            }
        }
        function getToken() {
            skipSpace();
            let match = stream.match(/^'[^']*'\b/);
            if (match) {
                stream = stream.slice(match[0].length);
                token = { type : 'STRING' , value: match[0].slice(1,-1) };
            }
            if (!match) {
                match = stream.match(/^"[^"]*"\b/);
                if (match) {
                    stream = stream.slice(match[0].length);
                    token = { type : 'STRING' , value: match[0].slice(1,-1) };
                }
            }
            if (!match) {
                match = stream.match(/^[+-]?[0-9]+(|\.[0-9]+)\b/);
                if (match) {
                    stream = stream.slice(match[0].length);
                    token = { type : 'NUMBER' , value: match[0] };
                }
            }
            if (!match) {
                match = stream.match(/^[a-z][a-z_0-9]*(\.[a-z][a-z_0-9]*|)\b/);
                if (match) {
                    stream = stream.slice(match[0].length);
                    token = { type : 'FIELD' , value: match[0] };
                }
            }
            if (!match) {
                match = stream.match(/^(AND|OR)\b/);
                if (match) {
                    stream = stream.slice(match[0].length);
                    token = { type : 'OP' , value: match[0] };
                }
            }
            return token;
        } 
    },
    parseSelectExp: function(selectExpression) {

    }
    type: "ScriptUtils_QueryParser"
}