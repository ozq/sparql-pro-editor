class QueriesLocalRepository extends QueryRepository {
    constructor(historyRepository) {
        super(historyRepository);
        this.key = 'spe.localQueries';
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

    add(item) {
        item.updated_at = this.getCurrentUpdatedAtMark();
        var items = this.getAll();
        items.push(item);
        this.save(items);
        return item;
    };

    put(item) {
        item.updated_at = this.getCurrentUpdatedAtMark();
        var items = this.getAll();
        items[this.getIndexById(item.id)] = item;
        this.save(items);
    };

    remove(id) {
        var index = this.getIndexById(id);
        var items = this.getAll();
        items.splice(index, 1);
        this.save(items);
    };

    save(items) {
        localStorage.setItem(this.key, JSON.stringify(items));
    };

    generateId() {
        return new Date().getTime();
    };

    getIndexById(id) {
        var ids = this.getAll().map(function(item){return item.id;});
        return ids.indexOf(parseInt(id));
    };

    getCurrentUpdatedAtMark() {
        return new Date().getTime();
    }

    buildItem(item) {
        return {
            'id': this.generateId(),
            'name': item && item.name ? item.name : _.uniqueId('New sparql '),
            'query': item && item.query ? item.query : '',
            'updated_at': this.getCurrentUpdatedAtMark()
        };
    }
}
