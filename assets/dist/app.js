/** Init Yasqe Editor **/
var editor = YASQE.fromTextArea(
    document.getElementById('yasqe'),
    {
        mode: 'sparql11',
        indentUnit: 4
    }
);

/** Toolbar buttons **/
//TODO: вынести всю логику работы с кнопками в отдельное место [!]
//TODO: создать специальный класс/хэлпер для работы с yasqe-редактором
function deleteIndents()
{
    YASQE.commands['selectAll'](editor);
    editor.indentSelection('prev');
}

function getStringWithIndents(indentDepth, string) {
    return new Array(indentDepth * editor.options.indentUnit).join(' ') + string;
}

function getQueryPrefixes() {
    return editor.getPrefixesFromQuery();
}

function getAllPrefixes() {
    return Object.assign({}, getCommonPrefixesArray(), getQueryPrefixes());
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

$('#buttonBeautify').click(function() {
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
});

$('#buttonRemoveMinus').click(function() {
    removeAllOperatorsByName('minus');
});

$('#buttonExpandCompact').click(function() {
    var allPrefixes = getAllPrefixes();
    console.log(allPrefixes);
    //TODO: доделать метод [!]
});

/** Common prefixes logic **/
//TODO: вынести всю логику работы с common prefix в отдельное место [!]
//TODO: валидация вводимых префиксов
//TODO: абстрагироваться от localStorage

function getCommonPrefixesContent()
{
    return JSON.parse(localStorage.getItem('commonPrefixes'));
}

function getCommonPrefixesArray() {
    var commonPrefixesContent = getCommonPrefixesContent();
    var commonPrefixesArray = [];

    if (commonPrefixesContent) {
        commonPrefixesContent.forEach(function(item, i) {
            var prefixData = item.replace(new RegExp('PREFIX\\s*', 'i'), '');
            var matchedPrefixData = prefixData.match(new RegExp('(\\w+):(<.+>)'));
            if (matchedPrefixData) {
                commonPrefixesArray[matchedPrefixData[1]] = matchedPrefixData[2];
            }
        });
    }

    return commonPrefixesArray;
}

function getCommonPrefixesTextArea() {
    return document.getElementsByClassName('common-prefixes-textarea')[0];
}

function setCommonPrefixesData(data) {
    localStorage.setItem('commonPrefixes', JSON.stringify(data));
}

function initCommonPrefixesData() {
    var data = getCommonPrefixesContent();
    if (data) {
        getCommonPrefixesTextArea().value = data.join('\n');
    }
}

initCommonPrefixesData();

$('#buttonClearCommonPrefixes').click(function() {
    getCommonPrefixesTextArea().value = '';
    setCommonPrefixesData('');
});
$('#buttonSaveCommonPrefixes').click(function() {
    setCommonPrefixesData(getCommonPrefixesTextArea().value.split('\n'));
});
