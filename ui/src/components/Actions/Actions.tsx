
import React from "react";
import { Badge, Radio } from "antd";
import CalculateAction from "../CalculateAction";
import translations from "@/assets/translations";
import { isError, isFail, isPreconditionFail, isMissing, isAnomaly, isSuccess } from "@/utils/checker";
import styles from "./Actions.less";

interface Props {

}

const Actions: React.FC<any> = ({
    filterKey,
    setFilterKey,
    refresh,
    list
}) => {
    return (
        <>
            <CalculateAction refresh={refresh} />{" "}
            <Radio.Group value={filterKey} onChange={e => setFilterKey(e.target.value)}>
                <Radio.Button value="error">
                    {translations.error} <Badge count={list.filter(isError).length} />
                </Radio.Button>

                <Radio.Button value="fail">
                    {translations.fail} <Badge count={list.filter(isFail).length} />
                </Radio.Button>

                <Radio.Button value="preconditionFail">
                    {translations.preconditionFail} <Badge count={list.filter(isPreconditionFail).length} />
                </Radio.Button>

                <Radio.Button value="missing">
                    {translations.missing} <Badge count={list.filter(isMissing).length} />
                </Radio.Button>

                <Radio.Button value="anomaly">
                    {translations.anomaly} <Badge count={list.filter(isAnomaly).length} />
                </Radio.Button>

                <Radio.Button value="success">
                    {translations.success} <Badge count={list.filter(isSuccess).length} />
                </Radio.Button>
            </Radio.Group>
        </>
    );
}

export default Actions;