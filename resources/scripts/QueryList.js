export default class QueryList {
    constructor(element, repository, codeEditor) {
        this.element = $(element);
        this.elementId = element;
        this.repository = repository;
        this.codeEditor = codeEditor;
        this.buildList();
        this.initListeners();
    };

    buildList() {
        let items = this.repository.getAll();
        if (!_.isEmpty(items)) {
            let listContent = '';
            items.forEach(item => {
                listContent += this.buildListItem(item.id, item.name);
            }, this);
            this.element.hide().html(listContent).fadeIn('slow');
        }
    }

    buildListItem(id, name, isNew) {
        let className = "query-item list-group-item " + (isNew ? 'not-saved'  : '');

        return '' +
            "<a href='#' data-id='" + id + "' class='" + className + "'>" +
                "<div class='query-item_info'>" +
                    "<span class='query-item_title'>" + name + "</span>" +
                    "<div class='query-item_buttons'>" +
                        this.buildButtons() +
                    "</div>" +
                "</div>" +
                "<div class='query-item_rename' style='display: none;'>" +
                    "<label>New name:</label>" +
                    "<input type='text' class='form-control newQueryName' data-id='" + id + "' value='" + name + "'>" +
                "</div>" +
                "<div class='query-item_history' style='display: none;'>" +
                    "<label>History:</label>" +
                    "<ul class='list-group'>" +
                        this.buildQueryHistoryData(this.repository.getQueryHistory(id)) +
                    "</ul>" +
                "</div>" +
            "</a>";
    }

    buildButtons() {
        return '' +
            "<i class='fa fa-pencil buttonRenameQuery' aria-hidden='true' title='Rename'></i>" +
            "<i class='fa fa-history buttonViewQueryHistory' aria-hidden='true' title='Show history'></i>";
    }

    buildQueryHistoryData(items) {
        let history = [];
        items ? items.forEach(item => {
            history.push(this.buildQueryHistoryItem(item));
        }, this) : '';
        return history.length ? history.join('') : 'No data yet';
    }

    buildQueryHistoryItem(item) {
        return '' +
            "<li class='list-group-item history-item list-group-item-action' data-id='" + item.id + "'>" +
                (new Date(item.created_at)).toLocaleString() +
            "</li>"
    }

    getActiveItemId() {
        return this.getActiveItem().data('id');
    }

    getActiveItem() {
        return this.element.find('.list-group-item.active');
    }

    initListeners() {
        this.handleSaveNewQueryName();
        this.handleEditorChange();
        this.handleWindowClose();
        this.handleButtonsClick();
    }

    handleButtonsClick() {
        let queryListElement = this.element;
        this.element.on('click', '.buttonRenameQuery', function() {
            let renameBlock = $(this).closest('.list-group-item').find('.query-item_rename');
            let renameInput = renameBlock.find('.newQueryName');
            renameBlock.slideToggle(100);
            queryListElement.find('.query-item_rename').not(renameBlock).hide();
            renameInput.focus();
        });
        this.element.on('click', '.buttonViewQueryHistory', function() {
            let historyBlock = $(this).closest('.list-group-item').find('.query-item_history');
            historyBlock.slideToggle(100);
            queryListElement.find('.query-item_history').not(historyBlock).hide();
        });
    }

    handleWindowClose() {
        let thisObject = this;
        window.onbeforeunload = function() {
            if (thisObject.element.find('.list-group-item.not-saved').length) {
                return 'There are some not-saved queries. Do you want to save them?';
            }
        };
    }

    handleEditorChange() {
        let self = this;
        self.codeEditor.editor.on('change', function(editor) {
            let selectedId = self.getActiveItemId();
            if (editor.getOption('id') === selectedId) {
                self.element.find(".list-group-item[data-id='" + selectedId + "']").addClass('not-saved');
            }
        });
    }

    handleSaveNewQueryName() {
        let self = this;
        self.element.on('keypress', '.newQueryName', function(e) {
            if (e.which === 13){
                let item = self.repository.get($(this).data('id'));
                if (item) {
                    item.name = $(this).val();
                    self.repository.put(item);
                    $(this).closest('.list-group-item').find('.query-item_title').text($(this).val());
                    $(this).parent('.query-item_rename').slideToggle(100);
                } else {
                    $.notify(
                        '<strong>Selected item not found!</strong><br>',
                        {
                            type: 'warning',
                            placement: {
                                from: 'bottom',
                                align: 'right'
                            }
                        }
                    );
                }
            }
        });
    }
}
