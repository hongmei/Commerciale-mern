import React, { Component } from "react";
import "./index.css";
import FilterForm from "../../components/FilterForm";
import { requestAPI } from "../../utils/api";
import CompanyCell from "../../components/CompanyCell";
import { Dropdown } from "react-bootstrap";
// import Sidebar from "../../components/Sidebar";
import Pagination from "react-js-pagination";
import { orderTags, numberFromStringWithUnit, SESSION_LOGGED_COMPANY, SESSION_FILTER, ORDERS } from "../../utils";
import SpinnerView from "../../components/SpinnerView";
import { LangConsumer } from "../../utils/LanguageContext";
import { STRINGS } from "../../utils/strings";

let lang = null;

export default class Dashboard extends Component {
    constructor(props) {
        super(props);

        this.state = {
            numberOfCompanies: 0,
            companies: [],
            selectedOrder: ORDERS()[0],
            isExpandedSidebar: false,
            activePage: 1,
            filter: null,
            isProcessing: false,
            viewMode: 0,
            itemsCountPerPage: 30,
            filterBarXSScrollPos: window.pageYOffset,
            filterBarXSVisible: true,
        };

        this.fileterPanel = React.createRef(); // Create a ref object
    }

    componentDidMount = () => {
        if (window.innerWidth <= 576) {
            this.setState({
                itemsCountPerPage: 15,
            });
            window.addEventListener("scroll", this.handleWindowScroll);
        }

        this.setState({ updateFilterForm: true });

        this.setState({ isProcessing: true });
        this.getLocationAndPull();
    };

    componentWillUnmount() {
        if (window.innerWidth <= 576) {
            window.removeEventListener("scroll", this.handleWindowScroll);
        }
    }

    componentWillReceiveProps = (props) => {
        let orders = ORDERS();
        orders.forEach((elem) => {
            if (this.state.selectedOrder && elem.id === this.state.selectedOrder.id) {
                this.setState({ selectedOrder: elem });
            }
        });
    };

    handleWindowScroll = () => {
        const { filterBarXSScrollPos } = this.state;

        const currentScrollPos = window.pageYOffset;
        const filterBarXSVisible = filterBarXSScrollPos > currentScrollPos;

        this.setState({
            filterBarXSScrollPos: currentScrollPos,
            filterBarXSVisible,
            updateFilterForm: false,
        });
    };

    getLocationAndPull = () => {
        let loggedUser = JSON.parse(sessionStorage.getItem(SESSION_LOGGED_COMPANY));
        if (
            loggedUser &&
            loggedUser.profile.contact &&
            loggedUser.profile.contact.location &&
            loggedUser.profile.contact.location.coordinates[0] &&
            loggedUser.profile.contact.location.coordinates[1]
        ) {
            let myLocation = loggedUser.profile.contact.location.coordinates;
            this.setState({ myLocation });
            this.pullCompanies(this.state.activePage, this.state.itemsCountPerPage, this.state.selectedOrder, myLocation);
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this.showPosition);
        } else {
            this.pullCompanies(this.state.activePage, this.state.itemsCountPerPage, this.state.selectedOrder);
        }
    };

    showPosition = (position) => {
        let myLocation = [position.coords.longitude, position.coords.latitude];
        this.setState({ myLocation });
        this.pullCompanies(this.state.activePage, this.state.itemsCountPerPage, this.state.selectedOrder, myLocation);
    };

    pullCompanies = async (pageNumber, count, sort, coordinates) => {
        let filter = JSON.parse(sessionStorage.getItem(SESSION_FILTER));
        this.setState({ filter: filter, isExpandedSidebar: false });

        let searchFilter = {
            offset: (pageNumber - 1) * count,
            count: count,
        };
        if (coordinates) searchFilter.coordinates = coordinates;

        if (sort.id === 0) {
            searchFilter.sort = { title: "relevance", asc: 1 };
        } else if (sort.id === 1) {
            searchFilter.sort = { title: "revenues", asc: 1 };
        } else if (sort.id === 2) {
            searchFilter.sort = { title: "revenues", asc: -1 };
        } else if (sort.id === 3) {
            searchFilter.sort = { title: "employees", asc: 1 };
        } else if (sort.id === 4) {
            searchFilter.sort = { title: "employees", asc: -1 };
        } else if (sort.id === 5) {
            searchFilter.sort = { title: "distance", asc: 1 };
        } else if (sort.id === 6) {
            searchFilter.sort = { title: "distance", asc: -1 };
        } else {
            searchFilter.sort = { title: "relevance", asc: 1 };
        }

        console.log(filter);
        if (filter) {
            if (filter.region && filter.region.value) searchFilter.region = filter.region.label;
            if (filter.city && filter.city.value) {
                searchFilter.city = filter.city.label;
                if (filter.radius) searchFilter.radius = filter.radius;
            }
            if (filter.type && filter.type.value) searchFilter.type = filter.type.value;
            if (filter.employeeMin && filter.employeeMin.value) searchFilter.employeeMin = numberFromStringWithUnit(filter.employeeMin.label);
            if (filter.employeeMax && filter.employeeMax.value) searchFilter.employeeMax = numberFromStringWithUnit(filter.employeeMax.label);
            if (filter.revenueMin && filter.revenueMin.value) searchFilter.revenueMin = numberFromStringWithUnit(filter.revenueMin.label);
            if (filter.revenueMax && filter.revenueMax.value) searchFilter.revenueMax = numberFromStringWithUnit(filter.revenueMax.label);
            if (filter.ateco) searchFilter.ateco = filter.ateco.value;
            if (filter.tags && filter.tags.length) {
                lang === "en" ? (searchFilter.tags = { en: filter.tags }) : (searchFilter.tags = { it: filter.tags });
            }
        }

        console.log(searchFilter);
        this.setState({ isProcessing: true });
        let response = await requestAPI(`/companies`, "POST", searchFilter);
        let result = await response.json();
        this.setState({ isProcessing: false });
        if (result.error) {
            alert(STRINGS[result.error]);
            return;
        }

        if (filter.tags && filter.tags.length) {
            result.companies.forEach((company) => {
                if (company.tags) {
                    if (lang === "en") {
                        company.tags.en = orderTags(company.tags.en, filter.tags);
                    } else {
                        company.tags.it = orderTags(company.tags.it, filter.tags);
                    }
                }
            });
        }

        this.setState({ numberOfCompanies: result.count, companies: result.companies });
    };

    handleClickOrder = (item) => {
        this.pullCompanies(1, this.state.itemsCountPerPage, item, this.state.myLocation);
        this.setState({
            selectedOrder: item,
            activePage: 1,
        });
    };

    handleClickFilter = () => {
        window.scrollTo(0, 0);
        this.setState({
            isExpandedSidebar: !this.state.isExpandedSidebar,
        });
    };

    handleCollpaseFilter = () => {
        this.setState({
            isExpandedSidebar: false,
        });
    };

    handleClickPrev = (e) => {
        let pageNumber = this.state.activePage > 1 ? this.state.activePage - 1 : 1;
        this.pullCompanies(pageNumber, this.state.itemsCountPerPage, this.state.selectedOrder, this.state.myLocation);
        this.setState({ activePage: pageNumber });
    };
    handleClickNext = (e) => {
        const { activePage, numberOfCompanies, itemsCountPerPage, selectedOrder, myLocation } = this.state;
        if (!numberOfCompanies) {
            return;
        }

        let temp = (activePage * itemsCountPerPage) / (numberOfCompanies + 1);
        let pageNumber = temp < 1 ? activePage + 1 : activePage;
        this.pullCompanies(pageNumber, itemsCountPerPage, selectedOrder, myLocation);
        this.setState({ activePage: pageNumber });
    };

    handleChangePage(pageNumber) {
        this.pullCompanies(pageNumber, this.state.itemsCountPerPage, this.state.selectedOrder, this.state.myLocation);
        this.setState({ activePage: pageNumber });
    }

    handleClickSearch = async (filter) => {
        sessionStorage.setItem(SESSION_FILTER, JSON.stringify(filter));
        this.setState({
            updateFilterForm: false,
        });
        this.pullCompanies(1, this.state.itemsCountPerPage, this.state.selectedOrder, this.state.myLocation);
    };

    handleClickList = () => {
        this.pullCompanies(1, 15, this.state.selectedOrder, this.state.myLocation);
        this.setState({
            viewMode: 1,
            itemsCountPerPage: 15,
        });
    };

    handleClickGrid = () => {
        this.pullCompanies(1, 30, this.state.selectedOrder, this.state.myLocation);
        this.setState({
            viewMode: 1,
            itemsCountPerPage: 30,
        });
    };

    handleClickProfile = (id) => {
        window.location.href = `/company/${id}`;
    };

    render() {
        const {
            numberOfCompanies,
            companies,
            selectedOrder,
            isExpandedSidebar,
            activePage,
            isProcessing,
            filter,
            updateFilterForm,
            viewMode,
            itemsCountPerPage,
            filterBarXSVisible,
        } = this.state;

        const dropdown = (
            <Dropdown>
                <Dropdown.Toggle>
                    {selectedOrder.icon ? <i className={`fa fa-${selectedOrder.icon} pr-2`} /> : <div></div>}
                    {selectedOrder.title}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    {ORDERS().map((item) => (
                        <Dropdown.Item key={item.id} onClick={() => this.handleClickOrder(item)}>
                            {item.title}
                        </Dropdown.Item>
                    ))}
                </Dropdown.Menu>
            </Dropdown>
        );

        const filterBarXS = (
            <div>
                <div className={`filter-bar-xs ${!filterBarXSVisible ? "move" : ""}`}>
                    {dropdown}
                    <button className="btn-filter" onClick={this.handleClickFilter}>
                        <i className="fa fa-filter pr-2" />
                        {STRINGS.filter}
                    </button>
                </div>
                <div className="result-xs">
                    <div>{`${(activePage - 1) * itemsCountPerPage + 1}-${(activePage - 1) * itemsCountPerPage + companies.length} / ${numberOfCompanies} ${
                        STRINGS.results
                    }`}</div>
                    <div>
                        <button className="btn-prev secondary round mr-2" onClick={this.handleClickPrev}>
                            <i className="fa fa-angle-left" />
                        </button>
                        {activePage}
                        <button className="btn-next secondary round ml-2" onClick={this.handleClickNext}>
                            <i className="fa fa-angle-right" />
                        </button>
                    </div>
                </div>
            </div>
        );

        const filterBarMD = (
            <div className="filter-bar">
                <span className="result-md">
                    {`${(activePage - 1) * itemsCountPerPage + 1}-${(activePage - 1) * itemsCountPerPage + companies.length} / ${numberOfCompanies} ${STRINGS.results}`}
                </span>
                <div className="d-flex">
                    {dropdown}
                    <button className={`btn-view ${!viewMode ? "active" : ""}`} onClick={this.handleClickGrid}>
                        <i className="fa fa-th-large" />
                    </button>
                    <button className={`btn-view ${viewMode ? "active" : ""}`} onClick={this.handleClickList}>
                        <i className="fa fa-th-list" />
                    </button>
                </div>
            </div>
        );

        // const spinnerPanel = (
        // 	<div className="spinner-panel">
        // 		<Spinner animation="border" />
        // 	</div>
        // );

        const listPanel = (
            <div className="list-panel">
                <div className="row company-list">
                    {companies.map((company, index) => (
                        <div key={index} className={`grid-cell ${viewMode ? "col-12" : "col-sm-6 col-12"} `}>
                            <CompanyCell company={company} viewMode={viewMode} handleClickProfile={() => this.handleClickProfile(company._id)} />
                        </div>
                    ))}
                </div>
                <div className="pagination-bar">
                    <Pagination
                        activePage={activePage}
                        itemsCountPerPage={itemsCountPerPage}
                        totalItemsCount={numberOfCompanies}
                        onChange={this.handleChangePage.bind(this)}
                    />
                </div>
            </div>
        );
        return (
            <div className="dashboard container" ref={this.fileterPanel}>
                <LangConsumer>
                    {(value) => {
                        lang = value.lang;
                    }}
                </LangConsumer>
                <div className={`left-panel ${isExpandedSidebar ? "xs" : ""}`}>
                    <button
                        onClick={() =>
                            this.setState({
                                isExpandedSidebar: false,
                            })
                        }
                    >
                        <i className="fa fa-close" />
                    </button>
                    <FilterForm isInDashboard handleSearch={this.handleClickSearch} initialFilter={filter} update={updateFilterForm} />
                </div>
                <div className={`right-panel ${isExpandedSidebar ? "xs" : ""}`}>
                    {filterBarMD}
                    {filterBarXS}
                    {companies && companies.length ? listPanel : <div className="no-result">{STRINGS.noResults}</div>}
                    {isProcessing && <SpinnerView />}
                </div>
            </div>
        );
    }
}
