class QueryList {
    constructor(element, repository, editor) {
        this.element = $(element);
        this.elementId = element;
        this.repository = repository;
        this.editor = editor;
        this.buildList();
        this.initListeners();
    };

    buildList() {
        var items = this.repository.getAll();
        if (!_.isEmpty(items)) {
            var queryListObj = this;
            var listContent = '';
            items.forEach(function(item) {
                listContent += queryListObj.buildListItem(item.id, item.name);
            });
            this.element.hide().html(listContent).fadeIn('slow');
        }
    }

    buildListItem(id, name, isNew) {
        var className = "list-group-item " + (isNew ? 'not-saved'  : '');

        return "<a href='#' data-id='" + id + "' class='" + className + "'>" +
            "<div class='queryItemInfo'>" +
                "<span class='queryTitle'>" + name + "</span>" +
                "<span class='glyphicon glyphicon-pencil renameHistoryQuery' aria-hidden='true'>Rename</span>" +
            "</div>" +
            "<div class='querySettings' style='display: none;'>" +
                "<input type='text' class='form-control newQueryName' data-id='" + id + "' value='" + name + "'>" +
            "</div>" +
            "</a>";
    }

    getSelectedId() {
        return this.element.find(".list-group-item.active").data('id');
    }

    initListeners() {
        handleSaveNewQueryName(this);
        handleEditorChange(this);
        handleWindowClose(this);

        function handleEditorChange(queryList) {
            editor.on('change', function(editor) {
                var selectedId = queryList.element.find(".list-group-item.active").data('id');
                if (editor.getOption('id') === selectedId) {
                    queryList.element.find(".list-group-item[data-id='" + selectedId + "']").addClass('not-saved');
                }
            });
        }
        function handleSaveNewQueryName(queryList) {
            queryList.element.on('keypress', '.newQueryName', function(e) {
                if (e.which === 13){
                    var item = queryList.repository.get($(this).data('id'));
                    if (item) {
                        item.name = $(this).val();
                        queryList.repository.put(item);
                        $(this).closest('.list-group-item').find('.queryTitle').text($(this).val());
                        $(this).parent('.querySettings').slideToggle(100);
                    } else {
                        console.warn('Selected item not found!');
                    }
                }
            });
        }
        function handleWindowClose(queryList) {
            window.onbeforeunload = function() {
                if (queryList.element.find('.list-group-item.not-saved').length) {
                    return 'There are some not-saved queries. Do you want to save them?';
                }
            };
        }

        var queryList = this.element;
        this.element.on('click', '.renameHistoryQuery', function() {
            var querySettings = $(this).closest('.list-group-item').find('.querySettings');
            var renameInput = querySettings.find('.newQueryName');
            querySettings.slideToggle(100);
            queryList.find('.querySettings').not(querySettings).hide();
            renameInput.focus();
        });
    }
}
