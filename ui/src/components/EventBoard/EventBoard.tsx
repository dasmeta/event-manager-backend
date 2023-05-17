import React, { useCallback, useEffect, useState } from 'react';
import { Layout, Input, Row, Col, message } from 'antd';
import Actions from '../Actions';
import EventList from '../List';
import Links from '../Links';
import { eventStatsApi } from '@/services/api';
import { IconSearch } from "@/assets/icons";
import translations from '@/assets/translations';
import styles from "./EventBoard.less";

const EventBoard: React.FC<any> = (options) => {

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [filterKey, setFilterKey] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    eventStatsApi.eventStatsGet(Number.MAX_SAFE_INTEGER, 'topic:ASC,subscription:DESC')
      .then(({ data }) => {
        setList(data);
      })
      .catch(() => {
        message.error(translations.somethingWentWrong);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const showLoader = useCallback(() => {
    setLoading(true);
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

  const renderLinks = () => <Links options={options} refresh={refresh} showLoader={showLoader} />;

  const renderActions = () => (
    <Actions 
        filterKey={searchValue}
        setFilterKey={setSearchValue}
        refresh={refresh}
        list={list}
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
          <EventList
            options={options}
            loading={loading}
            refresh={refresh}
            list={list}
            filterKey={filterKey}
          />
        </Col>
      </Row>
    </Layout>
  );
};

export default EventBoard;
