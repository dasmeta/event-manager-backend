import { useCallback, useState } from "react";
import { Divider, Popconfirm, Radio } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { isMissing } from "@/utils/checker";
import formatMoney from "@/utils/format-number";
import translations from "@/assets/translations";
import { eventSubscriptionApi } from "@/services/api";
import styles from "@/assets/styles";

interface Props {
    item: any;
    refresh: () => {};
}

const Missing: React.FC<Props> = ({ item, refresh }) => {
    const [processing, setProcessing] = useState(false);
    const [as, setAs] = useState("fail");
    const handleChangeRadio = useCallback(
        e => {
            setAs(e.target.value);
        },
        [setAs]
    );
    const handlePopulateMissing = useCallback(() => {
        setProcessing(true);
        eventSubscriptionApi.eventSubscriptionsPopulateMissingPost({
            topic: item.topic,
            subscription: item.subscription,
            as,
        }).then(() => {
            setProcessing(false);
            refresh();
        });
    }, [item, as]);

    if (!isMissing(item)) {
        return null;
    }

    return (
        <>
            {processing ? (
                <a style={styles.error}>
                    <LoadingOutlined />
                </a>
            ) : (
                <Popconfirm
                    title={
                        <>
                            <div>
                                <i style={{color: "red"}}>This operation may have slow performance</i>
                            </div>
                            <div>
                                <strong>Populate Missing Subscriptions As</strong>
                            </div>
                            <div>
                                <Radio.Group onChange={handleChangeRadio} value={as}>
                                    <Radio style={{ display: "block" }} value="fail">
                                        {translations.default}
                                    </Radio>
                                    <Radio style={{ display: "block" }} value="success">
                                        {translations.success}
                                    </Radio>
                                    <Radio style={{ display: "block" }} value="error">
                                        {translations.error}
                                    </Radio>
                                </Radio.Group>
                            </div>
                        </>
                    }
                    onConfirm={handlePopulateMissing}
                >
                    <a style={styles.error}>{formatMoney(item.missing)}</a>
                </Popconfirm>
            )}
        </>
    );
};

export default Missing;