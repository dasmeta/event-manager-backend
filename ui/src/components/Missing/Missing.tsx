import { useCallback, useState } from "react";
import { Popconfirm, Radio, message } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { isMissing } from "@/utils/checker";
import formatMoney from "@/utils/format-number";
import translations from "@/assets/translations";
import { eventSubscriptionApi } from "@/services/api";
import styles from "../style.less";

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
        })
        .catch(() => {
            message.error(translations.somethingWentWrong);
        });
    }, [item, as]);

    if (!isMissing(item)) {
        return null;
    }

    return (
        <>
            {processing ? (
                <LoadingOutlined />
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
                    <span className={styles.title}>{formatMoney(item.missing)}</span>
                </Popconfirm>
            )}
        </>
    );
};

export default Missing;
