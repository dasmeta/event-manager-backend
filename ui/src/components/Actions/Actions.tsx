
import React, { useState } from "react";
import { Badge, Menu } from "antd";
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
                <span className={styles.actionTitle}>
                    {translations.error} <Badge
                        className={styles.badgeBgColor}
                        count={list.filter(isError).length}
                        showZero
                    />
                </span>
            ),
        },
        {
            key: 'fail',
            label: (
                <span className={styles.actionTitle}>
                    {translations.fail} <Badge
                        className={styles.badgeBgColor}
                        count={list.filter(isFail).length}
                        showZero
                    />
                </span>
            ),
        },
        {
            key: 'preconditionFail',
            label: (
                <span className={styles.actionTitle}>
                    {translations.preconditionFail} <Badge
                        className={styles.badgeBgColor}
                        count={list.filter(isPreconditionFail).length}
                        showZero
                    />
                </span>
            ),
        },
        {
            key: 'missing',
            label: (
                <span className={styles.actionTitle}>
                    {translations.missing} <Badge
                        className={styles.badgeBgColor}
                        count={list.filter(isMissing).length}
                        showZero
                    />
                </span>
            ),
        },
        {
            key: 'anomaly',
            label: (
                <span className={styles.actionTitle}>
                    {translations.anomaly} <Badge
                        className={styles.badgeBgColor}
                        count={list.filter(isAnomaly).length}
                        showZero
                    />
                </span>
            ),
        },
        {
            key: 'success',
            label: (
                <span className={styles.actionTitle}>
                    {translations.success} <Badge
                        className={styles.badgeBgColor}
                        count={list.filter(isSuccess).length}
                        showZero
                    />
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
        <Menu
            className={styles.badgeMenu}
            onClick={onClick}
            selectedKeys={[current]}
            mode="horizontal"
            items={items}
        />
    );
}

export default Actions;
