import { useCallback } from "react";
import { Popconfirm } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import formatMoney from "@/utils/format-number";
import { useSseAction } from "@/hooks/useSseAction";
import translations from "@/assets/translations";
import styles from "@/assets/styles";

export default ({ topic, subscription, type, count, refresh }) => {
    const { run, processing } = useSseAction();
    const handleMarkAsSuccess = useCallback(() => {
        run('/event-subscriptions/mark-as-success', {
            topic,
            subscription,
            type
        }, { title: translations.actionMarkAsSuccess }).then(() => {
            refresh();
        }).catch(() => {});
    }, [topic, subscription, type, run, refresh]);

    return (
        <>
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
