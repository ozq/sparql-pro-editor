class QueriesSharedRepository {
    constructor() {
        this.endpoint = 'api/v1/sharedQuery';
    };

    getAll() {
        var items = [];
        $.ajax({
            method: 'GET',
            url: this.endpoint,
            dataType: 'JSON',
            async: false,
            success: function(data) {
                items = data;
            }
        });

        return items ? items : [];
    };

    get(id) {
        var items;

        $.ajax({
            method: 'GET',
            url: this.endpoint + '/' + id,
            dataType: 'JSON',
            async: false,
            success: function(data) {
                items = data;
            }
        });

        return items;
    };

    add(item) {
        var newItem;
        $.ajax({
            method: 'POST',
            url: this.endpoint,
            dataType: 'JSON',
            data: item,
            async: false,
            success: function(data) {
                newItem = data;
            }
        });

        return newItem ? {id: newItem.id, name: item.name} : newItem;
    };

    put(item) {
        $.ajax({
            method: 'PUT',
            url: this.endpoint + '/' + item.id,
            dataType: 'JSON',
            data: item
        });
    };

    remove(id) {
        $.ajax({
            method: 'DELETE',
            url: this.endpoint + '/' + id,
            dataType: 'JSON'
        });
    };

    buildItem(item) {
        return item;
    }
}