var queryHistory = new QueryHistory();
var queryHistoryListElement = $('.query-history-list');

function QueryHistory() {
    var storageKey = 'spe.queryHistory';

    this.getAll = function () {
        var items = JSON.parse(localStorage.getItem(storageKey));
        return items ? items : [];
    };

    this.get = function (id) {
        return this.getAll().filter(function(item){ return item.id == id })[0];
    };

    this.generateId = function () {
        return new Date().getTime();
    };

    this.getIndexById = function (id) {
        var ids = this.getAll().map(function(item){return item.id;});
        return ids.indexOf(parseInt(id));
    };

    this.add = function(content, name) {
        var newItem = {
            'id': this.generateId(),
            'name': name ? name : 'New sparql ' + parseInt(this.getAll().length + 1),
            'content': content
        };
        var history = this.getAll();
        history.push(newItem);
        localStorage.setItem(storageKey, JSON.stringify(history));

        return newItem;
    };

    this.put = function (item) {
        var history = this.getAll();
        history[this.getIndexById(item.id)] = item;
        localStorage.setItem(storageKey, JSON.stringify(history));
    };

    this.delete = function (id) {
        var index = this.getIndexById(id);
        var history = this.getAll();
        history.splice(index, 1);
        localStorage.setItem(storageKey, JSON.stringify(history));
    };

    this.setSelectedId = function (id) {
        localStorage.setItem(storageKey + '.selected', id);
    };

    this.getSelectedId = function () {
        return localStorage.getItem(storageKey + '.selected');
    };
}

function buildHistoryItem(id, name, isNew) {
    var className = "list-group-item " + (isNew ? 'not-saved'  : '');

    return "<a href='#' data-id='" + id + "' class='" + className + "'>" +
        "<span class='queryTitle'>" + name + "</span>" +
        "<span class='glyphicon glyphicon-pencil renameHistoryQuery' aria-hidden='true'>Rename</span>" +
        "</a>" +
        "<div class='querySettings'>" +
        "<input type='text' class='form-control newQueryName' data-id='" + id + "' value='" + name + "' style='display: none;'>" +
        "</div>";
}

function initHistoryMenu() {
    var menuContent = '';

    if (!queryHistory.getAll().length) {
        queryHistory.add('', 'New sparql 1');
    }
    queryHistory.getAll().forEach(function(item) {
        menuContent += buildHistoryItem(item.id, item.name);
    });
    queryHistoryListElement.html(menuContent);

    var selectedIndex = queryHistory.getSelectedId();
    var selectedId = queryHistory.get(selectedIndex) ? selectedIndex : queryHistory.getAll()[0].id;

    selectQueryHistoryItem(selectedId);
}

function deleteQueryHistoryItem(id) {
    queryHistory.delete(id);
    var selectedItem = queryHistoryListElement.find(".list-group-item[data-id='" + id + "']");
    selectedItem.next('.querySettings').remove();
    selectedItem.remove();
    editor.setValue('');
}

function selectQueryHistoryItem(id, isForce) {
    var nextQuery = queryHistory.get(id);

    var leavingQuery = $('.query-history-list .list-group-item.active');

    if (isForce) {
        leavingQuery.removeClass('not-saved');
    } else {
        if (leavingQuery.length) {
            if (leavingQuery.hasClass('not-saved')) {
                QueryLeavingConfirmation.show(leavingQuery.data('id'), nextQuery.id);
                return;
            }
        }
    }

    if (nextQuery) {
        $('.query-history-list .list-group-item').removeClass('active');
        queryHistoryListElement.find(".list-group-item[data-id='" + nextQuery.id + "']").addClass('active');
        editor.setValue(nextQuery.content);
        queryHistory.setSelectedId(nextQuery.id);
        editor.setOption('id', nextQuery.id);
    }
}

function saveCurrentQuery() {
    saveQueryHistoryItem(queryHistory.getSelectedId());
}

function saveQueryHistoryItem(id) {
    var selectedItem = queryHistory.get(id);
    selectedItem.content = editor.getValue();
    queryHistory.put(selectedItem);
    queryHistoryListElement.find(".list-group-item[data-id='" + id + "']").removeClass('not-saved');
}

window.onbeforeunload = function() {
    if (queryHistoryListElement.find('.list-group-item.not-saved').length) {
        return 'There are some not-saved queries. Do you want to save them?';
    }
};

editor.on('change', function(editor) {
    var selectedId = queryHistoryListElement.find(".list-group-item.active").data('id');
    if (editor.getOption('id') == selectedId) {
        queryHistoryListElement.find(".list-group-item[data-id='" + selectedId + "']").addClass('not-saved');
    }
});

queryHistoryListElement.on('click', '.list-group-item', function() {
    if (!$(this).hasClass('active')) {
        selectQueryHistoryItem($(this).data('id'));
    }
});

$('#buttonAddQueryHistory').click(function() {
    var item = queryHistory.add('');
    queryHistoryListElement.append(buildHistoryItem(item.id, item.name));
    selectQueryHistoryItem(item.id);
    editor.setValue('');
});

$('#buttonDeleteQueryHistory').click(function() {
    var selectedId = queryHistory.getSelectedId();
    deleteQueryHistoryItem(selectedId);

    var selectingItem = queryHistoryListElement.find(".list-group-item").first();
    if (selectingItem) {
        selectQueryHistoryItem(selectingItem.data('id'));
    }
});

$('#buttonSaveQueryHistory').click(function() {
    saveCurrentQuery();
});
$(document).on('keydown', function(e){
    if (e.ctrlKey && e.which === 83){
        saveCurrentQuery();
    }
});

queryHistoryListElement.on('click', '.renameHistoryQuery', function() {
    var renameInput = $(this).parent().next('.querySettings').find('.newQueryName');
    renameInput.slideToggle(100).focus();
});

queryHistoryListElement.on('keypress', '.newQueryName', function(e) {
    if (e.which == 13){
        var item = queryHistory.get($(this).data('id'));
        item.name = $(this).val();
        queryHistory.put(item);
        $(this).parent().prev('.list-group-item').find('.queryTitle').text($(this).val());
        $(this).slideToggle(100);
    }
});
