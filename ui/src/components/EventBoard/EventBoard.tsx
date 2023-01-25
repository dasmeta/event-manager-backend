import React, { useCallback, useEffect, useState } from 'react';
import { Layout, Input, Row, Col } from 'antd';
import Actions from '../Actions';
import EventList from '../List';
import Links from '../Links';
import { eventStatsApi } from '@/services/api';
import { IconSearch } from "@/assets/icons";
import styles from "./EventBoard.less";

const EventBoard: React.FC<any> = (options) => {

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [filterKey, setFilterKey] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    eventStatsApi.eventStatsGet(undefined, 'topic:ASC,subscription:DESC')
      .then(({ data }) => {
        setList(data);
    })
    .finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setFilterKey(searchValue);
    }, 1000);
    return () => {
      clearTimeout(timer);
      setLoading(true);
    };
  }, [searchValue]);

  const renderSearch = () => (
    <Input
      size="large"
      allowClear={false}
      onChange={e => setSearchValue(e.target.value)}
      value={searchValue}
      placeholder="Search"
      prefix={<span className={styles.searchIcon}><IconSearch /></span>}
    />
  );

  useEffect(() => {
    refresh()
  }, []);

  const renderLinks = () => <Links options={options} refresh={refresh} />;

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

      <Row gutter={[12, 12]}>
        <Col span={24}>
          {renderActions()}
        </Col>
      </Row>
      <Row className={styles.searchAndActions} gutter={[8, 16]}>
        <Col {...colSearchProps}>
          {renderSearch()}
        </Col>
        <Col {...colActionsButtonProps} className={styles.actionsButton}>
          {renderLinks()}
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          {renderList()}
        </Col>
      </Row>
    </Layout>
  );
};

export default EventBoard;
