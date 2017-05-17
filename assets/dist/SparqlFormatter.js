function deleteIndents()
{
    YASQE.commands['selectAll'](editor);
    editor.indentSelection('prev');
}

function getStringWithIndents(indentDepth, string) {
    return new Array(indentDepth * editor.options.indentUnit).join(' ') + string;
}

function removeAllOperatorsByName(name) {
    var operatorStartIndex = 0;
    var processContent = editor.getValue();
    var operatorRegexp = new RegExp(name + '\\s*{', 'i');

    do {
        // Find operator start index
        operatorStartIndex = processContent.search(operatorRegexp);
        if (operatorStartIndex >= 0) {
            var matchedBracket;
            var bracketsCounter = 0;
            var bracketsRegexp = new RegExp('[{}]', 'g');
            bracketsRegexp.lastIndex = operatorStartIndex;

            // Find operator last bracket index
            while (matchedBracket = bracketsRegexp.exec(processContent)) {
                bracketsRegexp.lastIndex = matchedBracket.index + 1;
                matchedBracket[0] === '{' ? bracketsCounter++ : false;
                matchedBracket[0] === '}' ? bracketsCounter-- : false;
                if (bracketsCounter === 0) {
                    // Replace all content from operator start index to operator last bracket index
                    var operatorContent = processContent.substring(operatorStartIndex, bracketsRegexp.lastIndex);
                    processContent = processContent.replace(operatorContent, '');
                    break;
                }
            }

            // Handle brackets nesting error
            if (bracketsCounter > 0) {
                console.log('SPARQL syntax error, check brackets nesting.');
                break;
            }
        }
    } while (operatorStartIndex >= 0);

    // Update editor content
    editor.setValue(processContent);
}

function expandUri(content, prefixes) {
    Object.keys(prefixes).map(function(prefix) {
        var url = prefixes[prefix];
        var replacedContent = content.replace(new RegExp(prefix + ':(\\w+)', 'gi'), function(match, property) {
            return '<' + url + property + '>';
        });
        replacedContent ? content = replacedContent : false;
    });

    return content;
}

function compactUri(content, prefixes) {
    Object.keys(prefixes).map(function(prefix) {
        var url = prefixes[prefix];
        var replacedContent = content.replace(new RegExp('\<' + url + '(\\w+)\>', 'gi'), function(match, property) {
            return prefix + '\:' + property;
        });
        replacedContent ? content = replacedContent : false;
    });

    return content;
}

function beautifyCode() {
    deleteIndents();

    var indentDepth = 0;
    var formattedContent = [];
    var lineCount = editor.lineCount();

    for (var i = 0; i < lineCount; i++) {
        var currentString = editor.getLine(i);
        if (currentString.indexOf('{') > -1) {
            currentString = getStringWithIndents(indentDepth, currentString);
            indentDepth++;
        } else {
            if (currentString.indexOf('}') > -1) {
                indentDepth--;
            }
            currentString = getStringWithIndents(indentDepth, currentString);
        }
        formattedContent.push(currentString);
    }

    editor.setValue(formattedContent.join('\r\n'));
}
