import { useState, useCallback } from "react";
import { Button } from "antd";
import { DeleteOutlined, LoadingOutlined } from "@ant-design/icons";
import translations from "@/assets/translations";
import { useSseAction } from "@/hooks/useSseAction";

interface Props {
    item: any;
    refresh: () => {};
}

const FixMissingAction: React.FC<Props> = ({ item, refresh }) => {
    const { run, processing } = useSseAction();
    const handleCleanAnomaly = useCallback(() => {
        if (processing) {
            return;
        }
        run('/event-subscriptions/mark-missing-as-error', {
            topic: item.topic,
            subscription: item.subscription
        }, { title: translations.actionFixMissing }).then(() => {
            refresh();
        }).catch(() => {});
    }, [item, processing, run, refresh]);

    return (
        <Button size="small" onClick={handleCleanAnomaly}>
            {processing ? <LoadingOutlined /> : <DeleteOutlined />}
            {" "}
            {translations.fixMissing}
        </Button>
    );
};

export default FixMissingAction;
