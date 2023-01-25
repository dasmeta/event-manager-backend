
import React, { useState } from "react";
import { Badge, Radio, Menu } from "antd";
import type { MenuProps } from 'antd';
import translations from "@/assets/translations";
import { isError, isFail, isPreconditionFail, isMissing, isAnomaly, isSuccess } from "@/utils/checker";
import styles from "./Actions.less";

interface Props {

}

const Actions: React.FC<any> = ({
    filterKey,
    setFilterKey,
    list
}) => {

    const items: MenuProps['items'] = [
        {
            key: 'error',
            label: (
                <span className={styles.actinTitle}>
                    {translations.error} <Badge className={styles.badgeBgColor} count={list.filter(isError).length} />
                </span>
            ),
        },
        {
            key: 'fail',
            label: (
                <span className={styles.actinTitle}>
                    {translations.fail} <Badge className={styles.badgeBgColor} count={list.filter(isFail).length} />
                </span>
            ),
        },
        {
            key: 'preconditionFail',
            label: (
                <span className={styles.actinTitle}>
                    {translations.preconditionFail} <Badge className={styles.badgeBgColor} count={list.filter(isPreconditionFail).length} />
                </span>
            ),
        },
        {
            key: 'missing',
            label: (
                <span className={styles.actinTitle}>
                    {translations.missing} <Badge className={styles.badgeBgColor} count={list.filter(isMissing).length} />
                </span>
            ),
        },
        {
            key: 'anomaly',
            label: (
                <span className={styles.actinTitle}>
                    {translations.anomaly} <Badge className={styles.badgeBgColor} count={list.filter(isAnomaly).length} />
                </span>
            ),
        },
        {
            key: 'success',
            label: (
                <span className={styles.actinTitle}>
                    {translations.success} <Badge className={styles.badgeBgColor} count={list.filter(isSuccess).length} />
                </span>
            ),
        },
      ];      

    const [current, setCurrent] = useState('error');
    const onClick: MenuProps['onClick'] = (e) => {
        setFilterKey(e.key)
        setCurrent(e.key);
    };

    return (
        <>
            <Menu
                onClick={onClick}
                selectedKeys={[current]}
                mode="horizontal"
                items={items}
            />
        </>
        
    );
}

export default Actions;