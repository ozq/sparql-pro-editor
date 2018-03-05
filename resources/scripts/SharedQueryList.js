import QueryList from './QueryList';
import QueryShare from './QueryShare';

export default class SharedQueryList extends QueryList {
    buildButtons() {
        let baseButtons = super.buildButtons();
        return baseButtons + "<i class='fa fa-link buttonGetQueryLink' aria-hidden='true' title='Copy link'></i>";
    }

    handleButtonsClick() {
        super.handleButtonsClick();
        this.element.on('click', '.buttonGetQueryLink', function() {
            let id = $(this).closest('.query-item').data('id');
            QueryShare.share(id);
        });
    }
};
