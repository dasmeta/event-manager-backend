import React, { useCallback } from "react";
import { Popconfirm } from "antd";
import { LoadingOutlined } from "@ant-design/icons"
import { isAnomaly } from "@/utils/checker";
import formatMoney from "@/utils/format-number";
import { useSseAction } from "@/hooks/useSseAction";
import translations from "@/assets/translations";
import styles from "../style.less";

interface Props {
    item: any;
    refresh: () => {};
}

const Anomaly: React.FC<Props> = ({ item, refresh }) => {
    const { run, processing } = useSseAction();

    const handleCleanAnomaly = useCallback(() => {
        run('/event-subscriptions/clean-anomaly', {
            topic: item.topic,
            subscription: item.subscription,
        }, { title: translations.actionCleanAnomaly }).then(() => {
            refresh();
        }).catch(() => {});
    }, [item, run, refresh]);

    if (!isAnomaly(item)) {
        return null;
    }

    return (
        <>
            {processing ? (
                <LoadingOutlined />
            ) : (
                <Popconfirm title="Clean Anomaly Subscriptions?" onConfirm={handleCleanAnomaly}>
                    <span className={styles.title}>{formatMoney(item.subscriptionCount - item.topicCount)}</span>
                </Popconfirm>
            )}
        </>
    );
};

export default Anomaly;
