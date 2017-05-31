class QueryListManager {
    constructor(queryLeavingConfirmation) {
        this.key = 'spe.';
        this.queryLists = [];
        this.queryLeavingConfirmation = queryLeavingConfirmation;
    };

    selectDefaultItem() {
        var thisObject = this;
        var queryLists = this.queryLists;
        var defaultSelectedItem = this.getSelectedItem();

        if (defaultSelectedItem) {
            var selectedQueryList = queryLists[defaultSelectedItem.repository];
            if (selectedQueryList.repository.get(defaultSelectedItem.id)) {
                this.selectItem(selectedQueryList, defaultSelectedItem.id);
                return true;
            }
        }

        for (var key in queryLists) {
            var queryList = queryLists[key];
            var queryListItems = queryList.repository.getAll();
            if (queryListItems) {
                thisObject.selectItem(queryList, queryListItems[0].id);
                break;
            }
        }
    }

    selectItem(queryList, id, isForce) {
        if (!queryList) {
            var queryLists = this.queryLists;
            var selectedListItem = $('.query-list').find('.list-group-item.active');
            var currentListId = '#' + selectedListItem.parent().attr('id');
            Object.keys(queryLists).map(function(key) {
                var list = queryLists[key];
                if (list.elementId === currentListId) {
                    queryList = list;
                }
            });
        }

        var clickedQuery = queryList.repository.get(id);
        var leavingQuery = $('.query-list').find('.list-group-item.active');

        if (isForce) {
            leavingQuery.removeClass('not-saved');
        } else {
            if (leavingQuery.length) {
                if (leavingQuery.hasClass('not-saved')) {
                    this.queryLeavingConfirmation.show(leavingQuery.data('id'), clickedQuery.id);
                    return;
                }
            }
        }

        if (clickedQuery) {
            var queryExecutionParameters = JSON.parse(localStorage.getItem('spe.queryExecution'));
            if (clickedQuery.default_graph_uri) {
                $('.query-execution').find('input[name="default_graph_uri"]').val(clickedQuery.default_graph_uri);
            } else {
                if (queryExecutionParameters) {
                    $('.query-execution').find('input[name="default_graph_uri"]').val(queryExecutionParameters.default_graph_uri);
                }
            }
            if (clickedQuery.endpoint) {
                $('.query-execution').find('input[name="endpoint"]').val(clickedQuery.endpoint);
            } else {
                if (queryExecutionParameters) {
                    $('.query-execution').find('input[name="endpoint"]').val(queryExecutionParameters.endpoint);
                }
            }

            $('.query-list').find('.list-group-item').removeClass('active');
            queryList.element.find(".list-group-item[data-id='" + clickedQuery.id + "']").addClass('active');

            var editorQueryContent = clickedQuery.query ? clickedQuery.query : '';
            queryList.editor.setValue(editorQueryContent);

            var repositoryName = queryList.repository.constructor.name;
            this.setSelectedItem(repositoryName, clickedQuery.id);

            queryList.editor.setOption('id', clickedQuery.id);
        }
    }

    selectHistoryItem(queryList, id) {
        var historyItem = queryList.repository.historyRepository.get(id);
        queryList.editor.setValue(historyItem.query);
        queryList.element.find('.list-group-item').removeClass('not-saved');
    }

    saveItem(queryList) {
        var queryLists = this.queryLists;
        var selectedListItem = $('.query-list').find('.list-group-item.active');
        var currentListId = '#' + selectedListItem.parent().attr('id');

        if (!queryList) {
            Object.keys(queryLists).map(function(key) {
                var list = queryLists[key];
                if (list.elementId === currentListId) {
                    queryList = list;
                }
            });
        }

        if (queryList) {
            $('.query-list').find('.list-group-item.active');
            var selectedId = selectedListItem.data('id');
            var selectedItem = queryList.repository.get(selectedId);

            if (selectedItem) {
                selectedItem.query = queryList.editor.getValue();
                queryList.repository.put(selectedItem);
                queryList.element.find(".list-group-item[data-id='" + selectedId + "']").removeClass('not-saved');

                // Save query history
                var savedHistoryItem = queryList.repository.addHistory(selectedItem);
                // Rebuild history
                this.pushHistoryItem(savedHistoryItem, queryList, selectedListItem);

                // Rebuild list (last updated items)
                var allItems = queryList.element.find('.list-group-item.query-item').not('.active');
                queryList.element.html('');
                allItems.splice(0, 0, selectedListItem);
                $.each(allItems, function(i, item) {
                    queryList.element.append(item);
                });

                queryList.element.fadeIn();
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
    }

    pushHistoryItem(item, queryList, selectedListItem) {
        var savedHistoryElement = queryList.buildQueryHistoryItem(item);
        var allHistoryItems = selectedListItem.find('.query-item_history .list-group-item.history-item');
        var historyElement = selectedListItem.find('.query-item_history .list-group');
        historyElement.html('');
        allHistoryItems.splice(0, 0, $.parseHTML(savedHistoryElement)[0]);
        historyElement.html(allHistoryItems.slice(0, queryList.repository.historyRepository.maxItemsCount));
    }

    deleteItem(queryList, id) {
        if (id) {
            queryList.repository.remove(id);
            var selectedItem = queryList.element.find(".list-group-item[data-id='" + id + "']");
            queryList.repository.clearHistoryByQueryId(selectedItem.data('id'));
            selectedItem.remove();
            queryList.editor.setValue('');
            var selectingItem = queryList.element.find(".list-group-item").first();
            if (selectingItem) {
                this.selectItem(queryList, selectingItem.data('id'));
            }
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

    addItem(queryList, newItemData, isTemporary, isNew) {
        var preparedItemData = queryList.repository.buildItem(newItemData);
        if (!isTemporary) {
            var newItem = queryList.repository.add(preparedItemData);
        }
        queryList.element.prepend(queryList.buildListItem(newItem.id, newItem.name, isNew));
        return newItem.id;
    }

    setSelectedItem(repository, id) {
        var selectedItem = {
            repository: repository,
            id: id
        };
        localStorage.setItem(this.key + 'selectedQueryItem', JSON.stringify(selectedItem));
    };

    getListElementById(queryList, id) {
        return queryList.element.find(".list-group-item[data-id='" + id + "']")
    }

    getSelectedItem() {
        return JSON.parse(localStorage.getItem(this.key + 'selectedQueryItem'));
    };

    getSelectedItemName() {
        return $('.query-list').find('.list-group-item.active .query-item_title').text();
    }

    manage(queryList) {
        var repositoryName = queryList.repository.constructor.name;
        this.queryLists[repositoryName] = queryList;
        var thisObject = this;
        queryList.element.on('click', '.query-item.list-group-item', function() {
            if (!$(this).hasClass('active')) {
                thisObject.selectItem(queryList, $(this).data('id'));
            }
        });
        queryList.element.on('click', '.history-item.list-group-item', function() {
            thisObject.selectHistoryItem(queryList, $(this).data('id'));
        });
    };
}
