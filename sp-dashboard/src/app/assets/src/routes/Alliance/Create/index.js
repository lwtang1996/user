import React, { PureComponent } from 'react';
import { Form, Input, Select, Button, Table } from 'antd';
import { connect } from 'dva';

const FormItem = Form.Item;

@connect(({ organization, loading }) => ({
  organizationa:organization,
  //loadingOrgs: loading.effects['organization/fetchOrganizations'],
}))
@Form.create()
export default class CreateAlliance extends PureComponent {

  state = {
    submitting: false,
    selectedRows: [],
  };

  componentDidMount() {
    this.props.dispatch({
      type: 'organization/fetchOrganizations',
    });
  };

  onSelectChange = (selectedRowKeys,selectedRows) => {
    this.setState({selectedRows});
    console.log(this.state.selectedRows);
  };

  handleSubmit = e => {
    e.preventDefault();
    
    this.props.form.validateFields((err, values) => {
      if(!err) {
        const dataSubmit = {values:values, selectRows:this.state.selectedRows};
        //console.log(dataSubmit);
        this.setState({
          submitting: true,
        });
        this.props.dispatch({
          type: 'alliance/createAlliance',
          payload: {
            ...dataSubmit,
          }
        })
        //submitting = true;
        //console.log(values);
      }
    });
    //console.log({alliance_name});
  };
  render() {
    const { getFieldDecorator } = this.props.form;
    const { organizationa } = this.props;
    const { organizations } = organizationa;
    
    //console.log(organizations);
    //console.log(this.props.organizationa.organizations);
    const columns = [
      {
        title: '组织名称',
        dataIndex: 'orgname',
      },
      {
        title: '域名',
        dataIndex: 'orgdomain',
      },
      {
        title: '状态',
        dataIndex: 'orgstatus',
      },
    ];
    
    const data = organizations.map(function(item, index, arr) {
      item.key = index;
      return item;
    });
    console.log(data);
    const rowSelection = {
      onChange: this.onSelectChange,
      
    };
    const formItemLayout = {
      labelCol:{
        xs:{span:8},
        sm:{span:6},
      },
      wrapperCol:{
        xs:{span:8},
        sm:{span:8},
      },
    };
    const submitLayout = {
      wrapperCol:{
        xs:{span:8},
        sm:{span:8, offset:8},
      },
    };
    const consensusPolicies = ['solo', 'kafka'];
    const Option=Select.Option;
    const consensusOptions = consensusPolicies.map(
      (consensusPolicy) => (
        <Option value={consensusPolicy} >{consensusPolicy}</Option>
      ) 
    );
    const chainSizes = [2, 4];
    const chainSizeOptions = chainSizes.map(
      (chainSize) => (
        <Option value={chainSize}>{chainSize}</Option>
      )
    );

    return (
      <div >
        <Form onSubmit={this.handleSubmit}>
          <FormItem {...formItemLayout} label={'联盟名称'}>
              {getFieldDecorator('alliance_name', {
                initialValue: '',
                rules: [
                  {
                    required: true,
                    message: '请输入名称',
                  },
                ],
              })(<Input placeholder={''} />)}
            </FormItem>
            <FormItem {...formItemLayout} label={'共识策略'}>
              {getFieldDecorator('consensus_policy', {
                initialValue: consensusPolicies[0],
                rules: [
                  {
                    required: true,
                    message: '请输入共识策略',
                  },
                ],
              })(<Select>{consensusOptions}</Select>)}
            </FormItem>
            <FormItem {...formItemLayout} label={'联盟根域名'}>
              {getFieldDecorator('domain', {
                initialValue: '',
                rules: [
                  {
                    required: true,
                    message: '请输入联盟根域名',
                  },
                ],
              })(<Input placeholder={'edu.cn'}/>)}
            </FormItem>
            <FormItem {...formItemLayout} label={'共识节点数目'}>
              {getFieldDecorator('chain_size', {
                initialValue: chainSizes[0],
                rules: [
                  {
                    required: true,
                    message: '请输入节点数目',
                  },
                ],
              })(<Select>{chainSizeOptions}</Select>)}
            </FormItem>
            <FormItem {...formItemLayout} label={'加入联盟的组织'}>
              <Table rowSelection={rowSelection} columns={columns} dataSource={data}/>
            </FormItem>
            <FormItem {...submitLayout}>
              <Button loading={this.state.submitting} type='primary' htmlType='submit'>创建联盟</Button>
            </FormItem>
        </Form>

      </div>
    );
  }
}