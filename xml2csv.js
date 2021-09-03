let data = [];
let xmlFile;
let fileReader;
const dataHeaders =
    [
        'property_id',
        'account_number',
        'name',
        'address1',
        'address2',
        'city',
        'state_prov',
        'country_code',
        'postal_code',
        'primary_contact_id ',
        'notes',
        'survery_compliance',
        'last_survey',
        'next_survey'
    ];

export function parse(S, options) {
    "txml";
    options = options || {};

    var pos = options.pos || 0;
    var keepComments = !!options.keepComments;
    var keepWhitespace = !!options.keepWhitespace

    var openBracket = "<";
    var openBracketCC = "<".charCodeAt(0);
    var closeBracket = ">";
    var closeBracketCC = ">".charCodeAt(0);
    var minusCC = "-".charCodeAt(0);
    var slashCC = "/".charCodeAt(0);
    var exclamationCC = '!'.charCodeAt(0);
    var singleQuoteCC = "'".charCodeAt(0);
    var doubleQuoteCC = '"'.charCodeAt(0);
    var openCornerBracketCC = '['.charCodeAt(0);
    var closeCornerBracketCC = ']'.charCodeAt(0);


    /**
     * parsing a list of entries
     */
    function parseChildren(tagName) {
        var children = [];
        while (S[pos]) {
            if (S.charCodeAt(pos) == openBracketCC) {
                if (S.charCodeAt(pos + 1) === slashCC) {
                    var closeStart = pos + 2;
                    pos = S.indexOf(closeBracket, pos);

                    var closeTag = S.substring(closeStart, pos)
                    if (closeTag.indexOf(tagName) == -1) {
                        var parsedText = S.substring(0, pos).split('\n');
                        throw new Error(
                            'Unexpected close tag\nLine: ' + (parsedText.length - 1) +
                            '\nColumn: ' + (parsedText[parsedText.length - 1].length + 1) +
                            '\nChar: ' + S[pos]
                        );
                    }

                    if (pos + 1) pos += 1

                    return children;
                } else if (S.charCodeAt(pos + 1) === exclamationCC) {
                    if (S.charCodeAt(pos + 2) == minusCC) {
                        //comment support
                        const startCommentPos = pos;
                        while (pos !== -1 && !(S.charCodeAt(pos) === closeBracketCC && S.charCodeAt(pos - 1) == minusCC && S.charCodeAt(pos - 2) == minusCC && pos != -1)) {
                            pos = S.indexOf(closeBracket, pos + 1);
                        }
                        if (pos === -1) {
                            pos = S.length
                        }
                        if (keepComments) {
                            children.push(S.substring(startCommentPos, pos + 1));
                        }
                    } else if (
                        S.charCodeAt(pos + 2) === openCornerBracketCC
                        && S.charCodeAt(pos + 8) === openCornerBracketCC
                        && S.substr(pos + 3, 5).toLowerCase() === 'cdata'
                    ) {
                        // cdata
                        var cdataEndIndex = S.indexOf(']]>', pos);
                        if (cdataEndIndex == -1) {
                            children.push(S.substr(pos + 9));
                            pos = S.length;
                        } else {
                            children.push(S.substring(pos + 9, cdataEndIndex));
                            pos = cdataEndIndex + 3;
                        }
                        continue;
                    } else {
                        // doctypesupport
                        const startDoctype = pos + 1;
                        pos += 2;
                        var encapsuled = false;
                        while ((S.charCodeAt(pos) !== closeBracketCC || encapsuled === true) && S[pos]) {
                            if (S.charCodeAt(pos) === openCornerBracketCC) {
                                encapsuled = true;
                            } else if (encapsuled === true && S.charCodeAt(pos) === closeCornerBracketCC) {
                                encapsuled = false;
                            }
                            pos++;
                        }
                        children.push(S.substring(startDoctype, pos));
                    }
                    pos++;
                    continue;
                }
                var node = parseNode();
                children.push(node);
                if (node.tagName[0] === '?') {
                    children.push(...node.children);
                    node.children = [];
                }
            } else {
                var text = parseText();
                if (keepWhitespace) {
                    if (text.length > 0) {
                        children.push(text);
                    }
                } else {
                    var trimmed = text.trim();
                    if (trimmed.length > 0) {
                        children.push(trimmed);
                    }
                }
                pos++;
            }
        }
        return children;
    }

    /**
     *    returns the text outside of texts until the first '<'
     */
    function parseText() {
        var start = pos;
        pos = S.indexOf(openBracket, pos) - 1;
        if (pos === -2)
            pos = S.length;
        return S.slice(start, pos + 1);
    }
    /**
     *    returns text until the first nonAlphabetic letter
     */
    var nameSpacer = '\r\n\t>/= ';

    function parseName() {
        var start = pos;
        while (nameSpacer.indexOf(S[pos]) === -1 && S[pos]) {
            pos++;
        }
        return S.slice(start, pos);
    }
    /**
     *    is parsing a node, including tagName, Attributes and its children,
     * to parse children it uses the parseChildren again, that makes the parsing recursive
     */
    var NoChildNodes = options.noChildNodes || ['img', 'br', 'input', 'meta', 'link', 'hr'];

    function parseNode() {
        pos++;
        const tagName = parseName();
        const attributes = {};
        let children = [];

        // parsing attributes
        while (S.charCodeAt(pos) !== closeBracketCC && S[pos]) {
            var c = S.charCodeAt(pos);
            if ((c > 64 && c < 91) || (c > 96 && c < 123)) {
                //if('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(S[pos])!==-1 ){
                var name = parseName();
                // search beginning of the string
                var code = S.charCodeAt(pos);
                while (code && code !== singleQuoteCC && code !== doubleQuoteCC && !((code > 64 && code < 91) || (code > 96 && code < 123)) && code !== closeBracketCC) {
                    pos++;
                    code = S.charCodeAt(pos);
                }
                if (code === singleQuoteCC || code === doubleQuoteCC) {
                    var value = parseString();
                    if (pos === -1) {
                        return {
                            tagName,
                            attributes,
                            children,
                        };
                    }
                } else {
                    value = null;
                    pos--;
                }
                attributes[name] = value;
            }
            pos++;
        }
        // optional parsing of children
        if (S.charCodeAt(pos - 1) !== slashCC) {
            if (tagName == "script") {
                var start = pos + 1;
                pos = S.indexOf('</script>', pos);
                children = [S.slice(start, pos)];
                pos += 9;
            } else if (tagName == "style") {
                var start = pos + 1;
                pos = S.indexOf('</style>', pos);
                children = [S.slice(start, pos)];
                pos += 8;
            } else if (NoChildNodes.indexOf(tagName) === -1) {
                pos++;
                children = parseChildren(tagName);
            } else {
                pos++
            }
        } else {
            pos++;
        }
        return {
            tagName,
            attributes,
            children,
        };
    }

    /**
     *    is parsing a string, that starts with a char and with the same usually  ' or "
     */

    function parseString() {
        var startChar = S[pos];
        var startpos = pos + 1;
        pos = S.indexOf(startChar, startpos)
        return S.slice(startpos, pos);
    }

    /**
     *
     */
    function findElements() {
        var r = new RegExp('\\s' + options.attrName + '\\s*=[\'"]' + options.attrValue + '[\'"]').exec(S)
        if (r) {
            return r.index;
        } else {
            return -1;
        }
    }

    var out = null;
    if (options.attrValue !== undefined) {
        options.attrName = options.attrName || 'id';
        var out = [];

        while ((pos = findElements()) !== -1) {
            pos = S.lastIndexOf('<', pos);
            if (pos !== -1) {
                out.push(parseNode());
            }
            S = S.substr(pos);
            pos = 0;
        }
    } else if (options.parseNode) {
        out = parseNode()
    } else {
        out = parseChildren('');
    }

    if (options.filter) {
        out = filter(out, options.filter);
    }

    if (options.simplify) {
        return simplify(Array.isArray(out) ? out : [out]);
    }

    if (options.setPos) {
        out.pos = pos;
    }

    return out;
};

export function simplify(children) {
    var out = {};
    if (!children.length) {
        return '';
    }

    if (children.length === 1 && typeof children[0] == 'string') {
        return children[0];
    }
    // map each object
    children.forEach(function (child) {
        if (typeof child !== 'object') {
            return;
        }
        if (!out[child.tagName])
            out[child.tagName] = [];
        var kids = simplify(child.children);
        out[child.tagName].push(kids);
        if (Object.keys(child.attributes).length) {
            kids._attributes = child.attributes;
        }
    });

    for (var i in out) {
        if (out[i].length == 1) {
            out[i] = out[i][0];
        }
    }

    return out;
};

const handleFileRead = () => {
    const content = fileReader.result; // we receive the file passed into FileReader
    xmlFile = simplify(parse(content)) // parsing and simplifying the xml data to make the data arrays with objects within them.
    data.push(dataHeaders); // we sets the headers for our csv file here
    try {
        xmlFile.Table_Facility.T_Facility.forEach((facility) => {
            let metadata = [];
            let previousDate;
            let nextDate;

            //Turnery operations for data we are looking for; does this data exists ? if so push data into metadata array : if not push in an empty string
            facility.Facility_ID ? metadata.push(facility.Facility_ID) : metadata.push(""); //property_id
            facility.Facility_Account_Number ? metadata.push(facility.Facility_Account_Number) : metadata.push(""); //account_number
            facility.Facility_Name ? metadata.push(facility.Facility_Name) : metadata.push(""); //name
            facility.Service_Address_Full ? metadata.push(facility.Service_Address_Full) : metadata.push(""); //address1
            metadata.push(""); //add address2 ? cannot be found, testing empty string in its place
            facility.Service_Address_City ? metadata.push(facility.Service_Address_City) : metadata.push(""); //city
            facility.Service_Address_State ? metadata.push(facility.Service_Address_State) : metadata.push(""); //state_prov
            metadata.push("US") //country code
            facility.Service_Address_Zip_Code ? metadata.push(facility.Service_Address_Zip_Code) : metadata.push(""); //postal_code
            facility.Facility_Contact_Mgr_ID ? metadata.push(facility.Facility_Contact_Mgr_ID) : metadata.push(""); //primary_contact_Id
            facility.Facility_Comments_01 ? metadata.push(facility.Facility_Comments_01) : metadata.push(""); //notes
            //survery_complicance,prev_date,next_date
            // service_compliance false if no start date or end date,  empty if no start date provided, empty if no end date provided
            if (facility.Facility_Survey_Date_Last && facility.Facility_Survey_Date_Next) {
                metadata.push("False");
                previousDate = facility.Facility_Survey_Date_Last.slice(0, 10) // cleans up date string
                nextDate = facility.Facility_Survey_Date_Next.slice(0, 10);
                metadata.push(previousDate);
                metadata.push(nextDate);
            } else if (facility.Facility_Survey_Date_Last && !facility.Facility_Survey_Date_Next) {
                metadata.push("");
                previousDate = facility.Facility_Survey_Date_Last.slice(0, 10)
                metadata.push(previousDate);
                metadata.push("");
            } else if (!facility.Facility_Survey_Date_Last && !facility.Facility_Survey_Date_Last) {
                metadata.push("");
                metadata.push("");
                metadata.push("");
            };
            data.push(metadata); // Put all the data together
        });

        let csvContent = ""
            + data.map(e => e.join(",")).join("\n");
        // we join all arrays into strings from our data array passying them in to csvContent
        let csvData = new Blob([csvContent], { type: 'text/csv' }); // pass in the string data into a blob object and specify the data type
        let csvUrl = URL.createObjectURL(csvData); // convert the blob into a URL string which can be attached to an <a> tag
        let link = document.createElement('a'); // we create an anchor element so we can attach an the our new csv file to it as the source
        link.href = csvUrl; // link the csv file
        link.target = '_blank'; //opens new tab to download
        link.download = "converted" + '.csv'; //we name the file "converted" and add the .csv extension
        link.click(); // we click our own element to download our sourced file.

        let secondaryLink = document.querySelectorAll('dl-link')
        secondaryLink.href = csvUrl;
        secondaryLink.target = '_blank'
        link.download = "converted" + '.csv';
        if (errors) {
            setErrors(null) //if errors we're present before this is where we reset them
        }
        setFormState(false) // change what is rendered in jsx based on setFormState property
    }
    catch (e) {
        setErrors("Incorrect file type imported")
        console.log(e)
    };
};

const handleUpload = (file) => {
    fileReader = new FileReader(); // a new instance of FileReader is created which allows us to read the contents of the uploaded file
    fileReader.onloadend = handleFileRead; // Once we finish reading the data, the assigned function will be invoke
    fileReader.readAsText(file); // We feed our uploaded file into the File Reader which will invoke our handleFileRead function passing in the file.
};

const newConversion = () => {
    setFormState(true);
};