import React, { useCallback, useState } from "react";
import { Divider, Popconfirm } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import formatMoney from "@/utils/format-number";
import styles from "@/assets/styles";

export default ({ topic, subscription, type, title, count, markAsSuccess, refresh }) => {
    const [processing, setProcessing] = useState(false);
    const handleMarkAsSuccess = useCallback(() => {
        setProcessing(true);
        markAsSuccess({
            topic,
            subscription,
            type,
        }).then(() => {
            setProcessing(false);
            refresh();
        });
    }, [topic, subscription]);

    return (
        <>
            <Divider type="vertical" />
            {title}:{" "}
            {processing ? (
                <a style={styles.error}>
                    <LoadingOutlined />
                </a>
            ) : (
                <Popconfirm
                    title={
                        <div>
                            <strong>Populate Failed Subscriptions As Success</strong>
                        </div>
                    }
                    onConfirm={handleMarkAsSuccess}
                >
                    <a style={styles.error}>{formatMoney(count)}</a>
                </Popconfirm>
            )}
        </>
    );
};