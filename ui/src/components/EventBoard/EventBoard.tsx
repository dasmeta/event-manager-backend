import React, { useCallback, useEffect, useState } from 'react';
import { Layout, Input, Row, Col } from 'antd';
import Actions from '../Actions';
import EventList from '../List';
import Links from '../Links';
import { eventStatsApi } from '@/services/api';
import { IconSearch } from "@/assets/icons";
import styles from "./EventBoard.less";

const { Search } = Input;

const EventBoard: React.FC<any> = (options) => {

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [filterKey, setFilterKey] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    eventStatsApi.eventStatsGet(undefined, 'topic:ASC,subscription:DESC').then(({ data }) => {
      setList(data);
      setLoading(false);
    })
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setFilterKey(searchValue); }, 1000);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const renderSearch = () => (
    <Search
      size="large"
      allowClear={false}
      onChange={e => setSearchValue(e.target.value)}
      value={searchValue}
      placeholder="Search"
      // prefix={<IconSearch />}
      // suffix={loading}
    />
  );

  useEffect(() => {
    refresh()
  }, []);

  const renderLinks = () => <Links options={options} />;

  const renderActions = () => (
    <Actions 
        filterKey={searchValue}
        setFilterKey={setSearchValue}
        refresh={refresh}
        list={list}
    />
  );

  const renderList = () => (
    <EventList
        options={options}
        loading={loading}
        refresh={refresh}
        list={list}
        filterKey={filterKey}
    />
  );

  const colSearchProps = {
    xs: 24,
    sm: 12,
    md: 8,
    lg: 12,
    xl: 12,
    xxl: 8,
  }

  const colActionsButtonProps = {
    ...colSearchProps,
    md: 18,
    xxl: 12,
  }

  return (
    <Layout>
      <Row className={styles.searchAndActions} gutter={[8, 16]}>
        <Col {...colSearchProps}>
          {renderSearch()}
        </Col>
        <Col {...colActionsButtonProps} className={styles.actionsButton}>
          {renderLinks()}
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* <Col span={12}>
          {renderActions()}
        </Col> */}

        <Col span={24}>
          {renderList()}
        </Col>
      </Row>
    </Layout>
  );
};

export default EventBoard;
