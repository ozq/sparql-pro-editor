import QueryRepository from './QueryRepository';

export default class QueriesSharedRepository extends QueryRepository {
    constructor(historyRepository) {
        super(historyRepository);
        this.endpoint = 'api/v1/sharedQuery';
    };

    getAll() {
        let items = [];
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
        let items;

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
        let newItem;
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
