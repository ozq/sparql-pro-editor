export default class QueryHistoryLocalRepository {
    constructor() {
        this.key = 'spe.queryHistory';
        this.maxItemsCount = 9;
    };

    getAll() {
        let all = JSON.parse(localStorage.getItem(this.key));

        let items = all ? all : [];
        items = _.sortBy(items, [function(item) { return item.created_at; }]).reverse();

        return items;
    };

    get(id) {
        return _.find(this.getAll(), function(item) {
            return parseInt(item.id) === parseInt(id)
        });
    };

    getByQueryId(queryId, repository) {
        let items = _.filter(this.getAll(), function(item) {
            return parseInt(item.queryId) === parseInt(queryId) && item.repository === repository;
        });

        return items.slice(0, this.maxItemsCount);
    }

    add(item) {
        item = this.map(item);
        let items = this.getAll();
        items.push(item);
        this.save(items);
        return item;
    };

    remove(id) {
        let index = this.getIndexById(id);
        let items = this.getAll();
        items.splice(index, 1);
        this.save(items);
    };

    clearHistoryByQueryId(id) {
        let items = this.getAll();
        let filteredItems = _.filter(items, function(item) { return parseInt(item.queryId) !== parseInt(id); });
        this.save(filteredItems);
    }

    save(items) {
        localStorage.setItem(this.key, JSON.stringify(items));
    };

    generateId() {
        return new Date().getTime();
    };

    getIndexById(id) {
        let ids = this.getAll().map(function(item){return item.id;});
        return ids.indexOf(parseInt(id));
    };

    getCurrentCreatedAtMark() {
        return new Date().getTime();
    }

    map(item) {
        return {
            'id': this.generateId(),
            'queryId': item.id,
            'repository': item.repository,
            'query': item.query,
            'created_at': this.getCurrentCreatedAtMark()
        };
    }
}
