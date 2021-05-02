function parse(UnsafeString: string) {
    return UnsafeString.toLocaleLowerCase().trim().replace(/\s/g, "_");
}
class ReturnMap<a, b> extends Map<a, b> {
    Meta: string[];
}

interface ReqCheck<dataObj> {
    check: (run: dataObj) => boolean;
    mode: (b1: boolean, b2: boolean) => boolean;
    Meta: string;
}

class ComStruct<parent>{
    Name: string;
    Disc: string;
    getParent: () => parent;
    constructor(Name: string, Disc: string, data: Map<String, any>, getParent: () => parent) {
        this.Name = parse(Name);
        this.Disc = parse(Disc);
        this.getParent = getParent;

        for (var i = 1; data.has(this.Name); i++) this.Name = parse(Name) + "_" + i;
        data.set(this.Name, this);
    }
}
export class Handler<dataObj> {
    ComList: Map<String, Command<dataObj>> = new Map();
    ComGroups: Map<String, ComGroup<dataObj>> = new Map();

    constructor() {
    }

    regComGroup(Name: string, Disc: string) {
        const self = this;
        return new ComGroup<dataObj>(Name, Disc, () => self);
    }
    /**
     * Exports a json object of all the commands and thier help information
     * @param Comgroup The Com group the command must belong to. Else a list of Comgroups is given depending on if the variable is true or not 
     * @returns Returns a Map with the data requested. With a added meta tag containing some information about the nature of information returned. 
     * Mainly if it details Command or Command Group data. The StringRead tag is added if the object is determined provided was a string, usefull for
     * error 404 results with parameters. 
     */
    getInfo(Comgroup?: ComGroup<dataObj> | string | boolean) {
        var output = new ReturnMap<String, String>();
        if (typeof Comgroup == "string") {
            Comgroup = this.ComGroups.get(parse(Comgroup));
            output.Meta.push("StringRead")
        }
        if (Comgroup) {
            this.ComList.forEach((val) => {
                if (typeof Comgroup == "boolean" || val.getParent() == Comgroup) {
                    output.set(val.Name, val.Disc)
                }
            });
            output.Meta.push("Command");
        } else {
            this.ComGroups.forEach(val => {
                output.set(val.Name, val.Disc);
            })
            output.Meta.push("Group")
        }
        return output;
    }
    /**
     * 
     * @param com Call a command
     * @param data The DataObject
     */
    async call(com: string, data: dataObj) {
        return await this.ComList.get(parse(com)).func(data);
    }
}



class ComGroup<dataObj> extends ComStruct<Handler<dataObj>>{

    constructor(Name: string, Disc: string, getParent: () => Handler<dataObj>) {
        super(Name, Disc, getParent().ComGroups, getParent);
    }

    regCom(Name: string, Disc: string, func: (run: dataObj) => Promise<void>) {
        const self = this;
        return new Command<dataObj>(Name, Disc, func, () => self)
    }

}
class Command<dataObj> extends ComStruct<ComGroup<dataObj>>{
  
    secChks: ReqCheck<dataObj>[];
    func: (run: dataObj) => Promise<String>;
    constructor(Name: string, Disc: string, func: (run: dataObj) => Promise<void>, getParent: () => ComGroup<dataObj>) {

        super(Name, Disc, getParent().getParent().ComList, getParent);
        this.func = async (run: dataObj) => {
            var Meta: String = "";

            if (!(this.secChks.length <= 0)) {
                var b: boolean = true;
                for (var i = this.secChks.length - 1; i <= 0; i--) {
                    var check = this.secChks[i];
                    const b2 = b;
                    b = check.mode(check.check(run), b)
                    
                    if (b != b2) 
                        Meta = check.Meta;
                    
                }

                if (!b) {
                    return Meta;
                }
            }

            func(run);
            return Meta;
        };
    }
    //First object gets priority
    addReqCheck(secChks: ReqCheck<dataObj>[] | ReqCheck<dataObj>) {
        var innerFunc = (f: ReqCheck<dataObj>) => this.secChks.push(f);
        if (secChks instanceof Array)
            secChks.forEach(val => {
                innerFunc(val);
            })
        else
            innerFunc(secChks);
        return this;
    }
}
