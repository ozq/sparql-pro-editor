class QueryRepository {
    constructor(historyRepository) {
        this.historyRepository = historyRepository ? historyRepository : null;
    };

    addHistory(item) {
        if (this.historyRepository) {
            item.repository = this.constructor.name;
            return this.historyRepository.add(item);
        }
        return false;
    }

    clearHistoryByQueryId(id) {
        if (this.historyRepository) {
            this.historyRepository.clearHistoryByQueryId(id);
        }
        return false;
    }

    getQueryHistory(id) {
        if (this.historyRepository) {
            return this.historyRepository.getByQueryId(id, this.constructor.name)
        }
        return false;
    }
}
