class QueriesLocalRepository {
    constructor() {
        this.key = 'spe.queryHistory';
    };

    getAll() {
        var all = JSON.parse(localStorage.getItem(this.key));
        var items = all ? all : [];

        if (!items.length) {
            items.push(this.buildItem());
            this.save(items);
        }

        items = _.sortBy(items, [function(item) { return item.updated_at; }]).reverse();

        return items;
    };

    get(id) {
        return this.getAll().filter(function(item){ return parseInt(item.id) === parseInt(id) })[0];
    };

    generateId() {
        return new Date().getTime();
    };

    getIndexById(id) {
        var ids = this.getAll().map(function(item){return item.id;});
        return ids.indexOf(parseInt(id));
    };

    add(item) {
        item.updated_at = this.getCurrentUpdatedAtMark();
        var history = this.getAll();
        history.push(item);
        this.save(history);
        return item;
    };

    put(item) {
        item.updated_at = this.getCurrentUpdatedAtMark();
        var history = this.getAll();
        history[this.getIndexById(item.id)] = item;
        this.save(history);
    };

    remove(id) {
        var index = this.getIndexById(id);
        var history = this.getAll();
        history.splice(index, 1);
        this.save(history);
    };

    save(history) {
        localStorage.setItem(this.key, JSON.stringify(history));
    };

    buildItem(item) {
        return {
            'id': this.generateId(),
            'name': item && item.name ? item.name : _.uniqueId('New sparql '),
            'query': item && item.query ? item.query : '',
            'updated_at': this.getCurrentUpdatedAtMark()
        };
    }

    getCurrentUpdatedAtMark() {
        return new Date().getTime();
    }
}
